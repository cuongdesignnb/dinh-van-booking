import { BadGatewayException, HttpException } from '@nestjs/common';

/**
 * Transport shared by every feature that calls an OpenAI-compatible provider
 * (content drafts, live chat). Only the server ever holds the API key.
 */
export type WireFormat = 'responses' | 'chat_completions';

export const MAX_PROVIDER_RESPONSE_BYTES = 2 * 1024 * 1024;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function endpoint(base: string, path: string): string {
  const clean = base.replace(/\/+$/, '');
  return clean.endsWith(`/${path}`) ? clean : `${clean}/${path}`;
}

export function extractResponseText(data: Record<string, unknown>, wire: WireFormat): string {
  if (wire === 'responses') {
    if (typeof data.output_text === 'string') return data.output_text;
    if (Array.isArray(data.output)) {
      const texts: string[] = [];
      for (const item of data.output) {
        if (!isRecord(item) || !Array.isArray(item.content)) continue;
        for (const part of item.content) if (isRecord(part) && typeof part.text === 'string') texts.push(part.text);
      }
      if (texts.length) return texts.join('\n');
    }
  }
  const choices = data.choices;
  if (Array.isArray(choices) && isRecord(choices[0])) {
    const message = choices[0].message;
    if (isRecord(message) && typeof message.content === 'string') return message.content;
    if (typeof choices[0].text === 'string') return choices[0].text;
  }
  throw new BadGatewayException('Nhà cung cấp AI trả về cấu trúc nội dung không nhận diện được');
}

/** Thrown for a non-2xx provider answer, keeping the status so callers can retry differently. */
export class ProviderHttpError extends BadGatewayException {
  constructor(readonly providerStatus: number) {
    super(`Nhà cung cấp AI trả về HTTP ${providerStatus}. Hãy kiểm tra API key, model và cấu hình endpoint.`);
  }
}

export async function readLimitedBody(response: Response, limit: number): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new BadGatewayException('Phản hồi từ nhà cung cấp vượt quá giới hạn cho phép');
    }
    parts.push(value);
  }
  return Buffer.concat(parts.map((part) => Buffer.from(part)));
}

export async function postProviderJson(
  url: string,
  apiKey: string,
  body: unknown,
  timeoutMs: number,
  maxBytes = MAX_PROVIDER_RESPONSE_BYTES,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new HttpException('Nhà cung cấp AI phản hồi quá thời gian cho phép', 504);
    }
    throw new BadGatewayException('Không kết nối được nhà cung cấp AI. Kiểm tra địa chỉ máy chủ và kết nối mạng.');
  }
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > maxBytes) throw new BadGatewayException('Phản hồi AI vượt quá giới hạn cho phép');
  let responseBuffer: Buffer;
  try {
    responseBuffer = await readLimitedBody(response, maxBytes);
  } catch (error) {
    if (error instanceof HttpException) throw error;
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new HttpException('Nhà cung cấp AI phản hồi quá thời gian cho phép', 504);
    }
    throw new BadGatewayException('Không đọc được phản hồi từ nhà cung cấp AI');
  }
  if (!response.ok) throw new ProviderHttpError(response.status);
  try {
    const json: unknown = JSON.parse(responseBuffer.toString('utf8'));
    if (!isRecord(json)) throw new Error('not an object');
    return json;
  } catch {
    throw new BadGatewayException('Nhà cung cấp AI trả về JSON không hợp lệ');
  }
}
