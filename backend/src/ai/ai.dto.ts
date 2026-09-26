import { Allow } from 'class-validator';

export class SaveAiSettingsDto {
  @Allow()
  content!: unknown;

  @Allow()
  image!: unknown;

  @Allow()
  expectedVersion!: unknown;
}

export class GenerateContentDto {
  @Allow()
  kind!: unknown;

  @Allow()
  brief!: unknown;

  @Allow()
  title?: unknown;

  @Allow()
  excerpt?: unknown;

  @Allow()
  currentContentId?: unknown;

  @Allow()
  generateImages?: unknown;

  @Allow()
  imageCount?: unknown;
}
