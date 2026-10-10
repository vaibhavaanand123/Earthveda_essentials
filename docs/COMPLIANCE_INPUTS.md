# Merchant compliance inputs and implemented surfaces

Reviewed against primary guidance on 10 October 2026. This is an implementation handoff, not a completed legal opinion for an unidentified seller. Real policies depend on your entity, turnover, products, food claims, supply chain and delivery arrangements.

The reference [Just Nosh](https://www.justnosh.de/) informed the accessible footer pattern, food detail/unit pricing presentation, bundles and story placement. Its legal wording has not been copied or treated as proof that Earthveda is compliant.

| Area | Implemented | Information or work you must supply |
| --- | --- | --- |
| Seller identity | Imprint/contact pages, configurable public identity | Legal entity, serviceable address, representative, email and applicable register/VAT details |
| Food distance sales | Ingredients, allergen emphasis, net weight, per-100-g nutrition, storage, food operator, origin; verification gate | Exact approved label data, required origin/preparation statements and a responsible operator for each market |
| Price transparency | Gross EUR price, actual shipping at review, per-kg price once weight is known | Confirm weights, VAT classification, delivery fees and any price claims |
| Order commitment | Basket review, food details, policies, final gross total and German `Zahlungspflichtig bestellen` button | Reviewed contract formation/terms, accepted methods and fulfilment timing |
| Withdrawal | Policy page, model-form fields, highlighted `Vertrag widerrufen`, two-step `Widerruf bestätigen`, timestamped downloadable/email receipt | Applicable rights, return address, timing, return postage and any lawful product-specific exception |
| Privacy | Editable bilingual policy, processor/retention/contact fields, restricted staff access and minimal public order views | Actual controller, purposes/legal bases, data rights, retention, transfers, processor agreements and supervisory authority |
| Newsletter | Separate consent, double opt-in, evidence timestamp/policy version, unsubscribe action | Approved marketing text and an unsubscribe-capable campaign provider; respect suppression lists when exporting |
| Cookies | Necessary cart/language preferences and staff session only; no optional tracker loaded | Update policy/consent implementation before introducing analytics, ads or third-party embedded tracking |
| Packaging | No invented registration claim | LUCID registration and applicable dual-system participation/reporting; confirm all packaging and supply-chain duties |
| Accessibility | Keyboard/focus patterns, labels, responsive layouts, editable accessibility page | Determine BFSG applicability/exemption from actual facts; perform browser, assistive technology and contrast testing |
| Consumer disputes | Editable dispute-resolution statement | Applicable VSBG wording; do not add the defunct EU ODR platform link |
| UK | UK postcode/address checks, EUR totals, independent UK launch gate | UK VAT/import/EORI/food-labelling/operator and UK consumer terms for the actual route; verify tax advice and carriers |

## Changes relevant to the current launch date

German BGB §356a requires an accessible electronic withdrawal function for applicable distance contracts concluded through an online interface. The implementation accepts a declaration without an account, lets the customer review name/contract/contact details, submits a second confirmation, stores the declaration and receipt time, and queues the durable email receipt. A receipt can also be downloaded immediately. Merchant operations must monitor receipt email failures and process declarations; the feature does not decide legal eligibility automatically.

Do not use a blanket “food is non-returnable” rule. Review lawful exceptions for the exact goods and packaging. The online form accepts external contract identifiers so it does not obstruct withdrawal simply because the customer cannot authenticate an order.

The EU ODR platform closed in 2025. The old standard ODR link should not be inserted. Any German consumer-arbitration statement still depends on the seller's obligations and participation.

Food declarations must be supplied before the purchase where required, not only hidden in pack photos. The catalogue is deliberately unverified until real data exists. No gluten-free, high-protein or other nutrition/health claim should be approved from marketing mockups alone. Confirm conditions for every claim, including the Plant protein product name, against the actual composition and label. Lot/best-before, traceability, recalls and warehouse food-safety procedures are operational responsibilities outside this storefront.

Germany/EU preparation does not automatically authorise sales throughout the EU. This version enables Germany and Great Britain only. Review additional countries before adding markets.

## Primary references

- [DDG §5 seller information](https://www.gesetze-im-internet.de/ddg/__5.html)
- [PAngV §4 unit pricing](https://www.gesetze-im-internet.de/pangv_2022/__4.html)
- [BGB §312j checkout information and button](https://www.gesetze-im-internet.de/bgb/__312j.html)
- [BGB §356a online withdrawal](https://www.gesetze-im-internet.de/bgb/__356a.html)
- [EU food information, Regulation 1169/2011](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169)
- [European Commission food labelling](https://food.ec.europa.eu/food-safety/labelling-and-nutrition/food-information-consumers-legislation_en)
- [LUCID packaging register](https://www.verpackungsregister.org/en/)
- [Federal accessibility guidance](https://www.bundesfachstelle-barrierefreiheit.de/EN/Home/home_node.html)
- [EU consumer redress/ODR closure](https://consumer-redress.ec.europa.eu/site-relocation_en)
- [GDPR text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)
- [UK VAT on direct overseas sales](https://www.gov.uk/guidance/vat-and-overseas-goods-sold-directly-to-customers-in-the-uk)
- [UK food labelling](https://www.gov.uk/food-labelling-and-packaging)
- [UK starting a food business](https://www.gov.uk/food-business-registration)

Prepare reviewed bilingual policy text for the Settings editor. Do not substitute another merchant's identity, address, allergen lists or legal text. Register/VAT/exemption fields can be genuinely inapplicable; record your reviewer’s reasoning rather than fabricating values to fill a screen.
