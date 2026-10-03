# Bundled Japanese municipality data

Source: [Geolonia Japanese Addresses](https://github.com/geolonia/japanese-addresses/tree/d016e03dc84feaca92fe8c20f4cf6926c19a4ac7), distribution commit `d016e03dc84feaca92fe8c20f4cf6926c19a4ac7`. The source project derives address data from MLIT position-reference information and Japan Post data. Data license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); attribution also appears in `/safety` under the optional birthplace source details.

Adaptation: group the pinned `docs/latest.csv` rows by prefecture and municipality, retain names/romanization, and average each municipality's valid town-level latitude/longitude representative points. Match the municipality names against the pinned `docs/api/ja.json`. Output contains 1,894 municipality/ward entries across 47 prefectures. Coordinates are approximate city-level representatives, **not** exact addresses, birth facilities, official municipal centroids, or a precision guarantee. Multiple wards of one named city use their representative mean; repeated city names across prefectures retain timezone-only confidence unless qualified.

Source CSV SHA-256: `d8f14da1c1ff15f1118452eb0c334d3d8fc45f9df3ccf08fc176ba5856eb2689`.

This is static public data bundled in the server. No runtime geocoding API, API key, new charge, or transmission of birthplace to a geocoding provider is added. `Asia/Tokyo` is resolved with the existing runtime ICU history, including historical daylight saving. Country-only input cannot establish coordinates. An unresolved or ambiguous nonempty place is rejected with short correction guidance before new calculations; missing place remains explicitly provisional in internal metadata and excludes ASC/MC and complete Human Design.
