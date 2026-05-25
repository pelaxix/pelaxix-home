const NIAGARA_LOCATIONS = [
  {
    name: "Falls Parking Lot A",
    type: "parking",
    address: "6635 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.07377,
    lng: -79.07924,
    mapsUrl: "https://www.google.ca/maps/place/Niagara+Falls+-+Parking+Lot+A/@43.0735225,-79.0801622,554m/data=!3m1!1e3!4m6!3m5!1s0x89d343c31886ee91:0xd5f1f2f4eb315207!8m2!3d43.07377!4d-79.07924!16s%2Fg%2F11vlg35xvd?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Floral Showhouse Parking Lot B",
    type: "parking",
    address: "7145 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.0715246,
    lng: -79.0745563,
    mapsUrl: "https://www.google.ca/maps/place/Niagara+Parks+Parking+Lot+B/@43.0714183,-79.0737769,392m/data=!3m1!1e3!4m6!3m5!1s0x89d343e1ba8b8451:0xf258108699e410e8!8m2!3d43.0715246!4d-79.0745563!16s%2Fg%2F11y1x9_kvn?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Rapidsview Parking Lot C",
    type: "parking",
    address: "7651 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.0650937,
    lng: -79.0642459,
    mapsUrl: "https://www.google.ca/maps/place/Rapidsview+Parking+Lot+(Parking+Lot+C)/@43.0662915,-79.0640446,1108m/data=!3m1!1e3!4m6!3m5!1s0x89d342d417b5f077:0xf673f5fed06d7aaf!8m2!3d43.0650937!4d-79.0642459!16s%2Fg%2F1hf6r0xp0?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Queen Victoria Place",
    type: "parking",
    address: "6345 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.0837649,
    lng: -79.0781158,
    mapsUrl: "https://www.google.ca/maps/place/Queen+Victoria+Park+Parking+Lot/@43.0836794,-79.0780925,196m/data=!3m1!1e3!4m6!3m5!1s0x89d343000443a2ef:0x73771cbc6f6dcee7!8m2!3d43.0837649!4d-79.0781158!16s%2Fg%2F11xs9nz9p7?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Dufferin Islands",
    type: "parking",
    address: "7400 Portage Road, Niagara Falls, ON",
    lat: 43.0668168,
    lng: -79.0706608,
    mapsUrl: "https://www.google.com/maps/place/Niagara+Parks+Dufferin+Islands+Parking/@43.0670372,-79.0709377,69m/data=!3m1!1e3!4m10!1m2!2m1!1sdufferin+islands+parking!3m6!1s0x89d343ae0f11c721:0x21e2278dcaf765a6!8m2!3d43.0668168!4d-79.0706608!15sChhkdWZmZXJpbiBpc2xhbmRzIHBhcmtpbmdaGiIYZHVmZmVyaW4gaXNsYW5kcyBwYXJraW5nkgELcGFya2luZ19sb3SaASRDaGREU1VoTk1HOW5TMFZKUTBGblNVUlBhR0Z5VkhOUlJSQULgAQD6AQQIABAt!16s%2Fg%2F11fxb0y1gb?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Kingsbridge Park",
    type: "parking",
    address: "7870 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.06425,
    lng: -79.050567,
    mapsUrl: "https://www.google.ca/maps/place/Kingsbridge+Park/@43.0641139,-79.0508392,277m/data=!3m1!1e3!4m10!1m2!2m1!1sparking!3m6!1s0x89d34244ce119fd7:0x51a0cc4625642523!8m2!3d43.06425!4d-79.050567!15sCgdwYXJraW5nWgkiB3BhcmtpbmeSAQRwYXJrmgEjQ2haRFNVaE5NRzluUzBWSlEwRm5TVU5LYVRacFZsWjNFQUXgAQD6AQUI5wEQQw!16s%2Fg%2F1w04l2c2?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Rainbow Bridge",
    type: "parking",
    address: "Rainbow Bridge, Niagara Falls, ON",
    lat: 43.0930667,
    lng: -79.0686039,
    mapsUrl: "https://www.google.ca/maps/place/Niagara+Parks+Rainbow+Bridge+Parking+Lot/@43.0931057,-79.0682034,165m/data=!3m1!1e3!4m6!3m5!1s0x89d343fd5ee458e9:0x238e31f5653e233e!8m2!3d43.0930667!4d-79.0686039!16s%2Fg%2F11tc1h_pd0?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "White Water Walk",
    type: "parking",
    address: "4330 River Road, Niagara Falls, ON",
    lat: 43.1109554,
    lng: -79.0604553,
    mapsUrl: "https://www.google.ca/maps/place/White+Water+Walk/@43.1111828,-79.0603696,277m/data=!3m1!1e3!4m10!1m2!2m1!1sparking!3m6!1s0x89d342d4f4364fc1:0x98986aa71e09d257!8m2!3d43.1109554!4d-79.0604553!15sCgdwYXJraW5nWgkiB3BhcmtpbmeSARJ0b3VyaXN0X2F0dHJhY3Rpb26aAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMjAxV0ZSV1pFaFdNblJFWWxodmVHSkdXbUZqZWs1NllWaE9lVTVIWXhBQuABAPoBBQicARA3!16s%2Fg%2F1wz53pk_?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Whirlpool Aero Car",
    type: "parking",
    address: "3850 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.1180306,
    lng: -79.0687889,
    mapsUrl: "https://www.google.ca/maps/place/Whirlpool+Aero+Car/@43.1179102,-79.0689817,165m/data=!3m1!1e3!4m10!1m2!2m1!1sparking!3m6!1s0x89d35cd41852f6c1:0xea6787ce240c67ab!8m2!3d43.1180306!4d-79.0687889!15sCgdwYXJraW5nWgkiB3BhcmtpbmeSARJ0b3VyaXN0X2F0dHJhY3Rpb26aAURDaTlEUVVsUlFVTnZaRU5vZEhsalJqbHZUMnR3ZFZwdGRFaGhSemgwWkVaS1ExcHVUazVrU0ZaWlV6RTVTR05WUlJBQuABAPoBBAgwEDY!16zL20vMDJtcjlt?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Whirlpool Parkette",
    type: "parking",
    address: "Niagara River Parkway near Whirlpool Road, Niagara Falls, ON",
    lat: 43.122397,
    lng: -79.066319
  },
  {
    name: "Fisherman's Parking Lot",
    type: "parking",
    address: "Niagara River Parkway near Niagara Glen, Niagara Falls, ON",
    lat: 43.1249852,
    lng: -79.0750953,
    mapsUrl: "https://www.google.com/maps/place/Niagara+Parks+Fisherman's+Parking+Lot/@43.1249805,-79.0807916,16z/data=!4m10!1m2!2m1!1sfishermans+parkin+lot!3m6!1s0x89d35da07a1d5151:0x270fff781328b758!8m2!3d43.1249852!4d-79.0750953!15sChdmaXNoZXJtYW4ncyBwYXJraW5nIGxvdJIBC3BhcmtpbmdfbG904AEA!16s%2Fg%2F11lq65s3nm?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Thompson Point and WildPlay Adventure Course Lot",
    type: "parking",
    address: "3500 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.1236319,
    lng: -79.0685295,
    mapsUrl: "https://www.google.com/maps/place/WildPlay+Niagara+Falls+Whirlpool+Adventure+Course/@43.1234973,-79.0682943,21z/data=!4m6!3m5!1s0x89d342d45e740f39:0x66b37eb4bd8d5386!8m2!3d43.1236319!4d-79.0685295!16s%2Fg%2F11clzhbvlz?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Butterfly Conservatory and Botanical Gardens",
    type: "parking",
    address: "2565 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.136085,
    lng: -79.0534903,
    mapsUrl: "https://www.google.ca/maps/place/Butterfly+Conservatory+Parking/@43.1359175,-79.0534088,138m/data=!3m1!1e3!4m10!1m2!2m1!1sButterfly+Conservatory+%26+Botanical+Gardens!3m6!1s0x89d35d476d9303d7:0xc9b95981362917bd!8m2!3d43.136085!4d-79.0534903!15sCipCdXR0ZXJmbHkgQ29uc2VydmF0b3J5ICYgQm90YW5pY2FsIEdhcmRlbnNaLCIqYnV0dGVyZmx5IGNvbnNlcnZhdG9yeSAmIGJvdGFuaWNhbCBnYXJkZW5zkgELcGFya2luZ19sb3SaASRDaGREU1VoTk1HOW5TMFZKUTBGblNVUm9PVjgyWVhkM1JSQULgAQD6AQUIgQkQQw!16s%2Fg%2F11hzxshbn6?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Niagara Glen and Nature Centre",
    type: "parking",
    address: "3050 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.1291667,
    lng: -79.06,
    mapsUrl: "https://www.google.ca/maps/place/Niagara+Glen+Nature+Centre/@43.1296851,-79.060445,320m/data=!3m1!1e3!4m6!3m5!1s0x89d35d21720e1ddd:0xdaeaaad7a479ff76!8m2!3d43.1291667!4d-79.06!16s%2Fm%2F0h3p3nq?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Queenston Heights Park",
    type: "parking",
    address: "14184 Niagara River Parkway, Queenston, ON",
    lat: 43.1587641,
    lng: -79.0515406,
    mapsUrl: "https://www.google.ca/maps/place/Queenston+Heights+Park/@43.1575192,-79.0514767,658m/data=!3m1!1e3!4m6!3m5!1s0x89d35dafb05e504f:0x217edd4b7ce28385!8m2!3d43.1587641!4d-79.0515406!16s%2Fg%2F1tdjs3j8?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Old Fort Erie",
    type: "parking",
    address: "350 Lakeshore Road, Fort Erie, ON",
    lat: 42.8946381,
    lng: -78.9239321,
    mapsUrl: "https://www.google.ca/maps/place/Old+Fort+Erie/@42.8942225,-78.9243331,393m/data=!3m1!1e3!4m6!3m5!1s0x89d3138958422cb1:0x6dbd585c4c96ccd2!8m2!3d42.8946381!4d-78.9239321!16zL20vMDI5OTh3?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "McFarland House",
    type: "parking",
    address: "15927 Niagara River Parkway, Niagara-on-the-Lake, ON",
    lat: 43.23206,
    lng: -79.0610124,
    mapsUrl: "https://www.google.ca/maps/place/McFarland+House/@43.2320024,-79.061972,198m/data=!3m1!1e3!4m6!3m5!1s0x89d35f9e5516d261:0xb939874289095409!8m2!3d43.23206!4d-79.0610124!16s%2Fm%2F0k637j7?entry=ttu&g_ep=EgoyMDI2MDUyMC4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    name: "Queenston Heights Boat Launch",
    type: "boat-launch",
    address: "Queenston Heights, Niagara River Parkway, Queenston, ON",
    lat: 43.162638,
    lng: -79.050669
  },
  {
    name: "Ussher's Creek Boat Launch",
    type: "boat-launch",
    address: "Ussher's Creek Road, Niagara-on-the-Lake, ON",
    lat: 43.203501,
    lng: -79.060965
  },
  {
    name: "Netherby Road Boat Launch",
    type: "boat-launch",
    address: "Netherby Road, Fort Erie, ON",
    lat: 42.953892,
    lng: -78.942848
  },
  {
    name: "Anger Avenue Boat Launch",
    type: "boat-launch",
    address: "Anger Avenue, Fort Erie, ON",
    lat: 42.903681,
    lng: -78.924356
  },
  {
    name: "Nichol's Marine Boat Launch",
    type: "boat-launch",
    address: "Nichol's Marine, Fort Erie, ON",
    lat: 42.902219,
    lng: -78.917366
  },
  {
    name: "Niagara Parks Marina",
    type: "boat-launch",
    address: "Niagara Parks Marina, Fort Erie, ON",
    lat: 42.884105,
    lng: -78.924782
  }
];
