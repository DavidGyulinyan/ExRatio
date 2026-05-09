/** RA transport / vehicle finance tools — merged into LanguageContext per locale. */
export const AM_TRANSPORT_EN: Record<string, string> = {
  "amTransport.sectionTitle": "Vehicle finance & customs",
  "amTransport.modalTitle": "Vehicles & customs",
  "amTransport.heroSubtitle":
    "Rough customs estimate and a simplified note on income tax when you sell a car.",
  "amTransport.disclaimer":
    "For reference only. Confirm duties, taxes, and registration with the SRC and other official sources.",
  "amTransport.back": "Back",
  "amTransport.open": "Open tools",
  "quick.action.amTransport": "Vehicle finance",
  "amTransport.card.customs": "Customs clearance estimate",
  "amTransport.card.customs.desc": "Duty, excise, and VAT from declared value (approximate)",
  "amTransport.card.dealWorksheet": "Sale — income tax (approximate)",
  "amTransport.card.dealWorksheet.desc":
    "Years, sale price, power — if sold within one year of purchase, often 1% (min. AMD 150 per hp)",
  "amTransport.deal.acquisitionYear": "Year of purchase",
  "amTransport.deal.saleYear": "Year of sale",
  "amTransport.deal.acquisition": "Purchase price (AMD)",
  "amTransport.deal.importExport": "Other documented costs (AMD)",
  "amTransport.deal.importExportHint":
    "Optional. Used only for the gain/loss line. The tax estimate uses sale price and engine power.",
  "amTransport.deal.salePrice": "Sale price per contract (AMD)",
  "amTransport.deal.enginePower": "Engine power",
  "amTransport.deal.powerUnitLabel": "Unit",
  "amTransport.deal.unitHp": "Horsepower (hp)",
  "amTransport.deal.unitKw": "Kilowatts (kW)",
  "amTransport.deal.powerEquivalent": "≈ {value} {unit}",
  "amTransport.deal.powerBoth": "{hp} hp · {kw} kW",
  "amTransport.deal.totalOutlay": "Total cost (purchase + other costs)",
  "amTransport.deal.netVsOutlay": "Gain or loss (sale − total cost)",
  "amTransport.deal.holdingPeriod": "Years between purchase and sale (calendar)",
  "amTransport.deal.holdingExemptTitle": "Sale is usually not taxed as personal income",
  "amTransport.deal.holdingExemptBody":
    "After more than one year from the date of purchase, income from selling a personal car is generally not subject to personal income tax. Here we treat “more than one year” when the purchase and sale years differ by at least two (the law counts from the actual dates).",
  "amTransport.deal.holdingUncertain":
    "Purchase and sale fall in two consecutive calendar years. Whether a full year has passed depends on the exact dates — confirm with the SRC or a tax advisor. The figures below apply only if the sale is within one year of purchase.",
  "amTransport.deal.holdingTaxableShort":
    "Purchase and sale in the same year, or years not filled in: we show the “within one year” case (1% of sale, at least AMD 150 × hp). Enter both years for a clearer result.",
  "amTransport.deal.invalidYears": "Sale year cannot be earlier than the purchase year.",
  "amTransport.deal.taxOnePercent": "1% of sale price",
  "amTransport.deal.taxMinHp": "Minimum tax (AMD 150 × hp)",
  "amTransport.deal.taxTotalQuickSale": "Tax if within one year of purchase (the higher of the two)",
  "amTransport.deal.taxRateNote":
    "Common reading of the rules: sale within one year of acquisition — 1%, not less than AMD 150 per hp; after one year — usually no personal income tax for a private seller (non-business). Withholding by the buyer as tax agent may still apply in some cases.",
  "amTransport.deal.taxNote":
    "Only calendar years are used, not exact dates. Enter hp or kW; kW is converted to hp for the minimum. Rules and practice change — rely on SRC guidance and your tax return.",
  "amTransport.deal.taxExemptShare": "Personal income tax on sale: likely none (held more than one year)",
  "amTransport.shareSummary": "Share results",
  "amTransport.clearAllFields": "Clear all",
};

export const AM_TRANSPORT_HY: Record<string, string> = {
  "amTransport.sectionTitle": "Ավտոմեքենա և մաքս",
  "amTransport.modalTitle": "Ավտո և մաքս",
  "amTransport.heroSubtitle":
    "Մաքսի մոտավոր գնահատում և վաճառքից եկամտային հարկի պարզեցված նշում։",
  "amTransport.disclaimer":
    "Տեղեկատվական է։ Մաքսը, հարկերը և գրանցումը ստուգեք ՊԵԿ-ով և պաշտոնական աղբյուրներով։",
  "amTransport.back": "Հետ",
  "amTransport.open": "Բացել",
  "quick.action.amTransport": "Ավտո · մաքս",
  "amTransport.card.customs": "Մաքսազերծման հաշվիչ",
  "amTransport.card.customs.desc": "Մաքս, հաշվիչային հարկ, ԱԱՀ՝ ըստ հայտարարված արժեքի (մոտավոր)",
  "amTransport.card.dealWorksheet": "Վաճառք · եկամտային հարկ (մոտավոր)",
  "amTransport.card.dealWorksheet.desc":
    "Տարեթվեր, վաճառքի գին, հզորություն — եթե վաճառքը մեկ տարվա ընթացքում է ձեռքբերումից, հաճախ 1% (նվազագույնը 150 ֏ յուրաքանչյուր ձիաուժի համար)",
  "amTransport.deal.acquisitionYear": "Ձեռքբերման տարեթիվ",
  "amTransport.deal.saleYear": "Վաճառքի տարեթիվ",
  "amTransport.deal.acquisition": "Ձեռքբերման գին (֏)",
  "amTransport.deal.importExport": "Այլ փաստաթղթավորված ծախսեր (֏)",
  "amTransport.deal.importExportHint":
    "Ըստ ցանկության։ Օգտագործվում է միայն շահույթ/վնասի տողի համար։ Հարկի գնահատումը հիմնվում է վաճառքի գնի և շարժիչի հզորության վրա։",
  "amTransport.deal.salePrice": "Վաճառքի գին՝ ըստ պայմանագրի (֏)",
  "amTransport.deal.enginePower": "Շարժիչի հզորություն",
  "amTransport.deal.powerUnitLabel": "Միավոր",
  "amTransport.deal.unitHp": "Ձիաուժ (hp)",
  "amTransport.deal.unitKw": "Կիլովատ (kW)",
  "amTransport.deal.powerEquivalent": "≈ {value} {unit}",
  "amTransport.deal.powerBoth": "{hp} ձ․· {kw} կՎ",
  "amTransport.deal.totalOutlay": "Ընդհանուր ծախս (գին + այլ ծախսեր)",
  "amTransport.deal.netVsOutlay": "Շահույթ կամ վնաս (վաճառք − ընդհանուր ծախս)",
  "amTransport.deal.holdingPeriod": "Տարիների տարբերություն (տարեթվերով)",
  "amTransport.deal.holdingExemptTitle": "Վաճառքից եկամուտը սովորաբար չի հարկվում",
  "amTransport.deal.holdingExemptBody":
    "Ձեռքբերման ամսաթվից մեկ տարուց հետո անհատի անձնական մեքենայի վաճառքից եկամուտը, որպես կանոն, եկամտային հարկի ենթակա չէ։ Այստեղ «մեկ տարուց ավելի» ենք համարում, երբ ձեռքբերման և վաճառքի տարեթվերը տարբերվում են առնվազն երկու տարով (օրենքում հաշվարկը կատարվում է ամսաթվերով)։",
  "amTransport.deal.holdingUncertain":
    "Ձեռքբերումը և վաճառքը տարբեր, բայց հաջորդական տարեթվերում են։ Արդյոք մեկ ամբողջ տարին անցել է, որոշվում է ամսաթվերով — ստուգեք ՊԵԿ-ում կամ հարկային խորհրդատուի մոտ։ Ստորևի թվերը վերաբերում են միայն այն դեպքին, երբ վաճառքը կատարվել է ձեռքբերումից մեկ տարվա ընթացքում։",
  "amTransport.deal.holdingTaxableShort":
    "Ձեռքբերում և վաճառք նույն տարում, կամ տարեթվերը չեք լրացրել․ ցուցադրում ենք «մեկ տարվա ընթացքում» սցենարը (վաճառքի 1%, նվազագույնը 150 ֏ × ձիաուժ)։ Լրացրեք երկու տարեթիվը՝ ավելի հստակ պատկերի համար։",
  "amTransport.deal.invalidYears": "Վաճառքի տարեթիվը չի կարող նախորդել ձեռքբերման տարեթվին։",
  "amTransport.deal.taxOnePercent": "Վաճառքի գնի 1%",
  "amTransport.deal.taxMinHp": "Նվազագույն հարկ (150 ֏ × ձիաուժ)",
  "amTransport.deal.taxTotalQuickSale": "Հարկ՝ եթե վաճառքը մեկ տարվա ընթացքում է (երկու գումարներից մեծը)",
  "amTransport.deal.taxRateNote":
    "Օրենքի ընդհանուր մեկնաբանությունը․ վաճառքը ձեռքբերումից մեկ տարվա ընթացքում — 1%, ոչ պակաս քան 150 ֏ յուրաքանչյուր ձիաուժի համար․ մեկ տարուց հետո՝ սովորաբար եկամտային հարկ չի գանձվում անձնական օգտագործման մեքենայի վաճառքից։ Որոշ դեպքերում գնորդը կարող է հարկ պահել որպես հարկային գործակալ — ստուգեք կիրառելի կանոնները։",
  "amTransport.deal.taxNote":
    "Օգտագործվում են միայն տարեթվերը, ոչ թե ամսաթվերը։ Մուտքագրեք hp կամ kW — kW-ը վերածվում է ձիաուժի նվազագույն հարկը հաշվելու համար։ Կանոնները փոխվում են — ապավինեք ՊԵԿ-ի պարզաբանումներին և հարկային հայտարարագրին։",
  "amTransport.deal.taxExemptShare": "Եկամտային հարկ (վաճառք)․ հավանաբար չկա (պահվել է մեկ տարուց ավելի)",
  "amTransport.shareSummary": "Կիսվել",
  "amTransport.clearAllFields": "Մաքրել դաշտերը",
};
