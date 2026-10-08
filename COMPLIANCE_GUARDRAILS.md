# ХАПАЙ SALE — Compliance Guardrails

Цель этого файла — не заменить юриста, бухгалтера или правила конкретной площадки, а не дать проекту случайно нарушить очевидные ограничения при росте каталога, рекламы и автоматизации.

## Главный принцип

У нас существуют два независимых сценария покупки:

1. **Самостоятельная покупка в магазине США** — пользователь переходит на сайт источника и платит продавцу самостоятельно. Если для ссылки используется affiliate-программа, она относится только к этому сценарию.
2. **Заказ через ХАПАЙ SALE** — отдельный checkout, отдельный договор/оферта, отдельная финансовая разбивка и отдельная операционная цепочка выкупа и доставки.

Нельзя автоматически считать, что право использовать данные или affiliate-контент маркетплейса одновременно разрешает использовать тот же контент для нашего managed-purchase checkout.

## Жёсткие технические правила

- API-ключи, bot tokens, payment secrets и credentials хранятся только server-side.
- Никаких marketplace credentials в публичном JavaScript, GitHub или HTML.
- Не собирать логины, пароли или коды подтверждения аккаунтов покупателей в сторонних магазинах.
- Не использовать собственную affiliate-ссылку для закупки товара, который сервис покупает для клиента.
- Каждый товар хранит `source`, source URL, ASIN/SKU, дату проверки цены и статус прав на контент.
- Manual snapshot никогда не называется live.
- Заказ хранит snapshot товара и цены на момент оформления, чтобы изменение каталога не переписывало историю.
- Все изменения заказа сотрудниками должны попадать в audit/timeline.

## Карточка товара

Перед публикацией карточка должна иметь:

- источник и исходную ссылку;
- время последней проверки цены;
- подтверждённую цену и скидку;
- рейтинг/отзывы, если они разрешены источником к отображению;
- фактический или оценочный billable weight;
- shipping / hazmat / restricted flags;
- статус `contentUseBasis`;
- статус `contentRightsStatus`;
- статус trademark review;
- отдельные флаги для affiliate и managed purchase;
- отдельный флаг `adsEligible`.

Если права на контент или правила источника не подтверждены, карточка не должна автоматически попадать в рекламу.

## Контент и изображения

- Не копировать чужой каталог «впрок» без разрешённого источника данных.
- Не скачивать и не переиспользовать изображения площадки как собственные, если лицензия/условия источника этого не разрешают.
- Для каждого подключаемого магазина фиксировать разрешённый способ получения и показа данных.
- Правила кэширования цены, рейтинга, изображений и других полей задаются отдельно для каждого adapter/source.
- Перед подключением нового API ещё раз сверять актуальную официальную документацию поставщика данных.

## Бренд и товарные знаки

- Публичный бренд проекта — независимый бренд ХАПАЙ SALE.
- Перед запуском используется собственный домен, не содержащий чужой товарный знак без разрешения.
- Не писать «официальный Amazon Украина», «официальный магазин» и подобные формулировки без соответствующего статуса.
- Названия магазинов используются как указание источника товара, а не как наш бренд.
- Реклама с товарными знаками проходит отдельный review перед публикацией.

## Affiliate flow

Если affiliate подключён:

- affiliate link ведёт пользователя на магазин;
- покупатель самостоятельно оформляет и оплачивает покупку в магазине;
- disclosure добавляется там, где этого требуют актуальные правила программы;
- affiliate tracking не применяется к нашему managed-purchase заказу;
- affiliate и закупочный аккаунты/процессы не смешиваются;
- актуальные правила программы перепроверяются перед включением автоматизации.

## Managed-purchase flow

Заказ через ХАПАЙ SALE должен хранить:

- клиента и получателя;
- состав заказа;
- источник каждого товара;
- согласованную сумму на товар;
- согласованные расходы;
- комиссию сервиса отдельно;
- версию оферты и timestamp согласия;
- purchase/order ID магазина;
- invoice/receipt;
- US warehouse package ID;
- фактический и объёмный вес;
- international tracking;
- украинскую ТТН;
- возвраты/остаток;
- итоговый отчёт комиссионера, если он применяется в выбранной юридической модели.

## Реклама

Товар нельзя автоматически отправлять в Google/Meta/Telegram-рекламу, пока:

- цена устарела;
- скидка не подтверждена;
- нет права на используемый контент;
- товарный знак требует review;
- источник запрещает выбранный способ использования данных;
- доставка ограничена;
- товар hazmat/restricted;
- рекламная формулировка создаёт впечатление официального представительства магазина;
- итоговая цена/условия сформулированы вводящим в заблуждение образом.

## Логистика и таможня

- Billable weight считается по правилу перевозчика, включая volumetric weight, когда применимо.
- Ограничения перевозчика проверяются по категории товара до принятия заказа.
- Стоимость, получатель и структура международного отправления сохраняются в заказе.
- Таможенные пороги, правила объединения отправлений и обязательные платежи перепроверяются по актуальным официальным источникам перед production-запуском и при изменении законодательства/процесса перевозчика.

## Финансы и налоги

До реального приёма денег должны быть закрыты:

- реквизиты ФОП;
- подходящие КВЭДы;
- договорная модель;
- бухгалтерский учёт средств клиента и комиссии;
- РРО/ПРРО и фискальный сценарий, если применимо;
- acquiring/payment flow;
- возвраты;
- первичные документы;
- финальная проверка бухгалтером/налоговым юристом.

Никаких фиктивных документов или договоров «для вида».

## Privacy / Security

- Собирать только данные, необходимые для заказа и доставки.
- Роли сотрудников работают по принципу least privilege.
- Финансы, документы и персональные данные доступны только ролям, которым они нужны.
- Production admin требует server-side authentication и RBAC.
- Sensitive files не должны лежать в публичном репозитории.
- Для критичных действий нужен audit log.

## Launch gates

Публичный запуск и рекламный трафик считаются разрешёнными только после ручного закрытия следующих флагов в конфиге/админке:

- independent brand selected;
- final domain selected;
- marketplace data rights reviewed;
- affiliate flow reviewed;
- managed-purchase flow reviewed;
- advertising policies reviewed;
- privacy and terms reviewed;
- tax/fiscal/payment flow reviewed;
- carrier restrictions reviewed.

## Перепроверка правил

Правила Amazon, Google, Meta, перевозчиков, платёжных систем и законодательство меняются. Поэтому Compliance Center — это не отметка «проверили один раз навсегда». Перед production launch, подключением нового источника, новой рекламной платформы или существенным изменением checkout нужно заново проверять актуальные официальные правила и фиксировать дату review.


## Mandatory Amazon-first publication gate (2026-10-08)

This project adopts a fail-closed policy for Amazon-derived offers. A deal must not be publicly promoted as verified, used in ads, or automatically posted unless the applicable official Amazon program terms and the specific data/content license have been checked and documented.

- Review the current official Amazon Associates Operating Agreement, Program Policies, Product Advertising API / Creators API terms (as applicable), trademark guidelines, and relevant country-specific terms before enabling an integration.
- Record for each source: permitted API, account approval, allowed use, image/link caching restrictions, price freshness, attribution/disclosure requirements, permitted distribution channels, review date, and reviewer.
- Do not scrape or bulk copy Amazon product content without express permission.
- Display up to five product images only if the source grants the necessary rights; never assume that externally hosted images are automatically licensed for embedding or social reposting.
- A crossed-out price and discount percentage require an attributable, permitted reference price and a current, independently validated comparison. CTR measures click-through, not discount authenticity.
- Keep Amazon affiliate links and content within their permitted use; a managed-purchase order must not reuse Associates links or Program Content in an unauthorized way.
- Telegram, social feeds, email, paid ads, and non-Amazon merchant comparisons each require a separate distribution-rights review before automation.
- Full-catalog search is disabled until an approved live data/search integration is deployed. A local snapshot must be labeled as such.
- No claim of compliance certification or guaranteed Amazon approval. Unresolved or ambiguous rights mean hold for manual review.
- Any compliance review must be repeated when official policies change.
