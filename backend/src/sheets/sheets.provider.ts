import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createSign } from 'node:crypto';

export type SheetCell = string | number | boolean | null;

/** Adapter boundary: tests use the isolated fake; production uses the Google Sheets REST API. */
@Injectable()
export class SheetsValuesProvider {
  private token: { value: string; expiresAt: number } | null = null;
  private readonly fakeValues = new Map<string, SheetCell[][]>();

  isFake(): boolean { return process.env.DVB_SHEETS_ADAPTER === 'fake' || process.env.NODE_ENV === 'test'; }

  setFakeRange(spreadsheetId: string, range: string, values: SheetCell[][]): void {
    if (!this.isFake()) throw new Error('Fake Sheets data is available only for an isolated test adapter.');
    this.fakeValues.set(`${spreadsheetId}:${range}`, values.map((row) => [...row]));
  }

  async read(spreadsheetId: string, range: string, formulas = true): Promise<SheetCell[][]> {
    if (this.isFake()) return this.fakeValues.get(`${spreadsheetId}:${range}`)?.map((row) => [...row]) ?? [];
    const query = new URLSearchParams({ valueRenderOption: formulas ? 'FORMULA' : 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' });
    const payload = await this.request(spreadsheetId, range, `?${query.toString()}`, undefined);
    const values = (payload as { values?: unknown[][] }).values ?? [];
    return values.map((row) => row.map((cell) => cell === null || ['string','number','boolean'].includes(typeof cell) ? cell as SheetCell : String(cell)));
  }

  async write(spreadsheetId: string, range: string, values: SheetCell[][]): Promise<void> {
    if (this.isFake()) { this.fakeValues.set(`${spreadsheetId}:${range}`, values.map((row) => [...row])); return; }
    const query = new URLSearchParams({ valueInputOption: 'RAW', includeValuesInResponse: 'false' });
    await this.request(spreadsheetId, range, `?${query.toString()}`, { method: 'PUT', body: JSON.stringify({ range, majorDimension: 'ROWS', values }) });
  }

  private async request(spreadsheetId: string, range: string, query: string, init: RequestInit | undefined): Promise<unknown> {
    const accessToken = await this.getToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${query}`;
    const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init?.headers } });
    if (!response.ok) {
      // Do not log or return response bodies: provider messages can contain workbook metadata.
      throw new ServiceUnavailableException(`Google Sheets API trả HTTP ${response.status}.`);
    }
    if (response.status === 204) return {};
    return response.json();
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const raw = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new ServiceUnavailableException('Chưa cấu hình credential Google Sheets sandbox trên máy chủ.');
    let account: { client_email?: string; private_key?: string };
    try { account = JSON.parse(raw) as typeof account; }
    catch { throw new ServiceUnavailableException('Credential Google Sheets có định dạng không hợp lệ.'); }
    if (!account.client_email || !account.private_key) throw new ServiceUnavailableException('Credential Google Sheets thiếu trường bắt buộc.');
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
    const signer = createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
    const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
    if (!response.ok) throw new ServiceUnavailableException(`Không lấy được access token Google (HTTP ${response.status}).`);
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new ServiceUnavailableException('Google không trả access token hợp lệ.');
    this.token = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
    return data.access_token;
  }
}
