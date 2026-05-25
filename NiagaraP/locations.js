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
    lat: 43.054884,
    lng: -79.042653
  },
  {
    name: "Rainbow Bridge",
    type: "parking",
    address: "Rainbow Bridge, Niagara Falls, ON",
    lat: 43.090508,
    lng: -79.067771
  },
  {
    name: "White Water Walk",
    type: "parking",
    address: "4330 River Road, Niagara Falls, ON",
    lat: 43.117688,
    lng: -79.060367
  },
  {
    name: "Whirlpool Aero Car",
    type: "parking",
    address: "3850 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.119108,
    lng: -79.064727
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
    lat: 43.127066,
    lng: -79.067124
  },
  {
    name: "Thompson Point and WildPlay Adventure Course Lot",
    type: "parking",
    address: "3500 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.129827,
    lng: -79.068979
  },
  {
    name: "Butterfly Conservatory and Botanical Gardens",
    type: "parking",
    address: "2565 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.146905,
    lng: -79.054551
  },
  {
    name: "Niagara Glen and Nature Centre",
    type: "parking",
    address: "3050 Niagara River Parkway, Niagara Falls, ON",
    lat: 43.136853,
    lng: -79.061695
  },
  {
    name: "Queenston Heights Park",
    type: "parking",
    address: "14184 Niagara River Parkway, Queenston, ON",
    lat: 43.160654,
    lng: -79.052869
  },
  {
    name: "Old Fort Erie",
    type: "parking",
    address: "350 Lakeshore Road, Fort Erie, ON",
    lat: 42.893719,
    lng: -78.923225
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
