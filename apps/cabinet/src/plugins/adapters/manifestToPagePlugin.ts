/**
 * Переходник «манифест дома → жилец страницы». Адаптер И-5 интеграции коворка
 * `cowork-server-plugin-pages`.
 *
 * ПОЧЕМУ ПЕРЕХОДНИК, А НЕ ПРЯМОЙ ПРОВОД. Манифест объявляет, ЧТО за жилец: пять полей плюс
 * форма показа. Он не несёт ни человекочитаемого имени, ни — тем более — рисовалок: функции по
 * проводу не ходят. Значит кабинет держит СВОЙ реестр рисовалок, а переходник женит одно с другим.
 * Манифест говорит «что», реестр — «чем это рисуется здесь».
 *
 * ПРИЗРАКОВ НЕ ЗАВОДИМ (Т4). Жилец, которому в кабинете не нашлось рисовалки, из сайдбара НЕ
 * исчезает: он зарегистрирован на сервере, и молча спрятать его значило бы показать оператору
 * картину, не совпадающую с тем, что происходит в доме. Он виден и помечен словами.
 */
import type { CabinetPagePlugin, PageWidgetForm } from '../pagePlugins';

/** Манифест в том виде, в каком его отдаёт дом. Ровно поля контракта, включённости здесь нет. */
export interface HomePluginManifest {
  readonly id: string;
  readonly version: string;
  readonly kind: 'handler' | 'report' | 'showcase';
  readonly mountTarget: string;
  readonly triggers: readonly string[];
  readonly displayForm?: PageWidgetForm;
  readonly description?: string;
}

export interface HomePluginState {
  readonly manifest: HomePluginManifest;
  readonly enabled: boolean;
}

/** Чем кабинет рисует конкретного жильца. Живёт на клиенте: по проводу функции не передать. */
export interface CabinetRenderer {
  readonly name: string;
  readonly renderWidget: () => import('react').ReactNode;
  readonly renderSettings?: () => import('react').ReactNode;
}

export type CabinetRendererRegistry = Readonly<Record<string, CabinetRenderer>>;

/**
 * Имя на крайний случай — из последней доли идентификатора: `membrana.showcase.chart-list` →
 * `chart-list`. Не украшение: пустая строка вместо имени сделала бы жильца безымянной строкой,
 * а идентификатор целиком не влезает в узкий сайдбар.
 */
export function fallbackName(id: string): string {
  const slug = id.split('.').at(-1) ?? id;
  return slug.length > 0 ? slug : id;
}

/**
 * Показывается ли жилец на странице.
 *
 * Только род `showcase`: у `handler` и `report` нет `displayForm`, рисовать их нечем, и место в
 * сайдбаре означало бы обещание виджета, которого не будет. Они работают в доме, просто не здесь.
 */
export function isPageTenant(manifest: HomePluginManifest): boolean {
  return manifest.kind === 'showcase';
}

/** Форма, которой жилец просит себя рисовать. Отсутствие формы у `showcase` — испорченный манифест. */
const formOf = (manifest: HomePluginManifest): PageWidgetForm => manifest.displayForm ?? 'row';

export function toPagePlugin(
  manifest: HomePluginManifest,
  renderer: CabinetRenderer | undefined,
): CabinetPagePlugin {
  if (renderer) {
    return {
      id: manifest.id,
      name: renderer.name,
      description: manifest.description,
      form: formOf(manifest),
      renderSettings: renderer.renderSettings,
      renderWidget: renderer.renderWidget,
    };
  }
  return {
    id: manifest.id,
    name: fallbackName(manifest.id),
    description: manifest.description,
    form: formOf(manifest),
    // Честная пустота вместо тихого исчезновения: жилец в доме есть, рисовалки в этом кабинете нет.
    renderWidget: () => 'Этот плагин зарегистрирован в доме, но кабинету нечем его нарисовать.',
  };
}

/** Жильцы страницы в порядке, в котором их назвал дом. Порядок дома — тоже сведение о доме. */
export function toPagePlugins(
  states: readonly HomePluginState[],
  renderers: CabinetRendererRegistry,
): readonly CabinetPagePlugin[] {
  return states
    .filter((s) => isPageTenant(s.manifest))
    .map((s) => toPagePlugin(s.manifest, renderers[s.manifest.id]));
}

/** Включённость, как её назвал дом. Единственный источник: страница своей не заводит. */
export function enabledIdsFromHome(states: readonly HomePluginState[]): readonly string[] {
  return states.filter((s) => isPageTenant(s.manifest) && s.enabled).map((s) => s.manifest.id);
}
