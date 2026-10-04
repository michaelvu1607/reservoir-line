export type PlaceNote = {
  displayName: string;
  about: string;
  note?: string;
};

/** Context for targets a judge can place. Heights still come only from the satellite file. */
export const PLACES: Record<string, PlaceNote> = {
  "462": {
    displayName: "Lake Powell",
    about:
      "Colorado River reservoir on the Utah–Arizona line. It stores water for Lake Mead and, downstream, farms and cities across the Southwest.",
  },
  "368": {
    displayName: "Salton Sea",
    about:
      "California’s largest lake. When the surface falls, the exposed bed becomes dust that reaches nearby towns.",
  },
  "414": {
    displayName: "Cahora Bassa",
    about: "Zambezi reservoir in Mozambique. It generates power and holds water for the lower river.",
  },
  "270": {
    displayName: "Caspian Sea",
    about:
      "The world’s largest inland water body, shared by five countries. A small drop in meters is a large loss of shore.",
  },
  "277": {
    displayName: "Aral Sea, north basin",
    about: "What remains of the Aral Sea in Central Asia, a lake that used to be one of the largest on Earth.",
  },
  "1442": {
    displayName: "Aral Sea, south basin",
    about: "A southern target on the Aral Sea, the inland sea that has lost most of its water over decades.",
  },
  "278": {
    displayName: "Lake Balkhash",
    about: "Large lake in Kazakhstan. Its level moves with the Ili River and irrigation upstream.",
  },
  "622": {
    displayName: "Lake Balkhash, east",
    about: "Eastern target on Lake Balkhash in Kazakhstan.",
  },
  "1465": {
    displayName: "Lake Oahe",
    about: "Missouri River reservoir in the Dakotas. It stores water for power, navigation, and plains cities.",
  },
  "684": {
    displayName: "Lake Sakakawea",
    about: "Missouri River reservoir in North Dakota, upstream of Lake Oahe.",
  },
  "338": {
    displayName: "Issyk-Kul",
    about: "Deep mountain lake in Kyrgyzstan and a major regional water body.",
  },
  "743": {
    displayName: "Kajakai",
    about: "Helmand River reservoir in Afghanistan, used for power and irrigation.",
  },
  "873": {
    displayName: "Kakhovka Reservoir",
    about: "Former reservoir on the Dnipro in Ukraine.",
    note: "The Kakhovka dam was destroyed in 2023. This low reading is the satellite record of that loss, not a seasonal drought.",
  },
  "395": {
    displayName: "Lake Balaton",
    about: "The largest lake in Central Europe, in Hungary.",
  },
  "29": {
    displayName: "Lake Atitlán",
    about: "Volcanic lake in the Guatemalan highlands, ringed by towns that use the shore.",
  },
};
