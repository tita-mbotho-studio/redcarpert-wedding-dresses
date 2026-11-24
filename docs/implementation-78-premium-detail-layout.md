# Implementation 78 — compact responsive bridal detail

Approved: smaller gallery and information card, centered text, preserved photo/video navigation and direct WhatsApp link. Do not add size fields or placeholders until client information arrives.

Shared CSS replaces inherited floats with a centered grid (1040px maximum overall; 400px gallery/card maximum; responsive height budget and 24–48px desktop gap). At widths below 768px stack media above the card. Reduce outer padding, card padding, heading/price typography and shadow; preserve the existing price wording, gallery arrows/dots, photo viewer, media URLs and compact 44/48px WhatsApp control. Related dresses remain below; single related item centered. No changes to the PDF, catalogue data, deployment or DNS.

Review using npm run check; npm run preview -- --port 4173 in one terminal; npm run test:alignment and npm run test:browser in another. Full browser verification is required before publishing. The existing all-route alignment suite now checks detail geometry at each of five widths.
