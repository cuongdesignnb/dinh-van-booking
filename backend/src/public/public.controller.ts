import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PublicCatalogService } from './public-catalog.service';
import { NavigationService } from '../navigation/navigation.service';

@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly catalog: PublicCatalogService, private readonly navigation: NavigationService) {}

  @Get('site')
  site() {
    return this.catalog.site();
  }

  @Get('favicon.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=3600')
  favicon() {
    return this.catalog.favicon();
  }

  @Get('seo/urls')
  seoUrls() {
    return this.catalog.seoUrls();
  }

  @Get('seo/policy')
  seoPolicy() {
    return this.catalog.seoPolicy();
  }

  @Get('routes/resolve')
  resolveRoute(@Query('path') path: string) {
    return this.catalog.resolveRoute(path);
  }

  @Get('legacy-target')
  legacyTarget(@Query('kind') kind: string, @Query('value') value: string) {
    return this.catalog.legacyTarget(kind, value);
  }

  @Get('stays')
  stays(@Query('featured') featured?: string) {
    return this.catalog.stays(featured === 'true');
  }

  @Get('stays/:slug')
  stay(@Param('slug') slug: string) {
    return this.catalog.stay(slug);
  }

  @Get('availability')
  @Header('Cache-Control', 'private, no-store')
  availability(@Query() query: Record<string, string>) {
    return this.catalog.availability(query);
  }

  @Get('combos')
  combos() {
    return this.catalog.combos();
  }

  @Get('combos/:slug')
  combo(@Param('slug') slug: string) {
    return this.catalog.combo(slug);
  }

  @Get('destinations')
  destinations() {
    return this.catalog.destinations();
  }

  @Get('destinations/:slug')
  destination(@Param('slug') slug: string) {
    return this.catalog.destination(slug);
  }

  @Get('articles')
  articles() {
    return this.catalog.articles();
  }

  @Get('articles/:slug')
  article(@Param('slug') slug: string) {
    return this.catalog.article(slug);
  }

  @Get('reviews')
  reviews(@Query('contentId') contentId?: string) {
    return this.catalog.reviews(contentId);
  }

  @Get('pages')
  pages() {
    return this.catalog.pages();
  }

  @Get('pages/:slug')
  page(@Param('slug') slug: string) {
    return this.catalog.page(slug);
  }

  @Get('navigation/:key')
  navigationMenu(@Param('key') key: string) {
    return this.navigation.publicMenu(key);
  }
}
