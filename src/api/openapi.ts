export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "FlameForge Reforged API",
    version: "2.0.0",
    description: "High-Performance Unofficial Genshin Impact RESTful Game Data Engine. Provides complete datasets for Characters (Lv1-13 talent scaling, C1-C6 constellations, voice actors, lore), Weapons (Lv1-90 stat progression curves, passives), and Artifacts (5-pc set bonuses and pieces).",
    contact: {
      name: "Vedant Kale",
      email: "vedantsapalkar99@gmail.com",
      url: "https://vedantkale.in"
    },
    license: {
      name: "ISC"
    }
  },
  servers: [
    {
      url: "/api",
      description: "Production API Server"
    }
  ],
  tags: [
    { name: "Characters", description: "Character archive, attributes, combat talents, constellations, and voice actors." },
    { name: "Weapons", description: "Weapon armory, progression stats (Lv1-90), passives, and refinements." },
    { name: "Artifacts", description: "Artifact reliquary, 2-pc/4-pc effects, and individual 5-piece lore." }
  ],
  paths: {
    "/character": {
      get: {
        tags: ["Characters"],
        summary: "Get Single Character",
        description: "Fetches a single character by exact name or returns a random character if name is omitted.",
        parameters: [
          {
            name: "name",
            in: "query",
            description: "Character name (e.g. `diluc`, `raiden-shogun`, `hu-tao`, `nahida`)",
            required: false,
            schema: { type: "string", example: "diluc" }
          },
          {
            name: "infoSize",
            in: "query",
            description: "Set to `full` to include all nested combat talents (Lv1-13 scaling), constellations (C1-C6), voice actors (EN/JP/CN/KR), and lore stories.",
            required: false,
            schema: { type: "string", enum: ["standard", "full"], default: "standard" }
          }
        ],
        responses: {
          "200": {
            description: "Character object payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Character" }
              }
            }
          },
          "404": {
            description: "Character not found"
          }
        }
      }
    },
    "/characters": {
      get: {
        tags: ["Characters"],
        summary: "List All Characters",
        description: "Retrieves an array of all Genshin Impact characters with multi-dimensional filtering options.",
        parameters: [
          {
            name: "vision",
            in: "query",
            description: "Filter by elemental Vision: `pyro`, `hydro`, `anemo`, `electro`, `dendro`, `cryo`, `geo`",
            required: false,
            schema: { type: "string", example: "pyro" }
          },
          {
            name: "region",
            in: "query",
            description: "Filter by region: `mondstadt`, `liyue`, `inazuma`, `sumeru`, `fontaine`, `natlan`, `snezhnaya`",
            required: false,
            schema: { type: "string", example: "mondstadt" }
          },
          {
            name: "rarity",
            in: "query",
            description: "Filter by star rarity: `5` or `4`",
            required: false,
            schema: { type: "integer", enum: [4, 5], example: 5 }
          },
          {
            name: "weapon",
            in: "query",
            description: "Filter by weapon type: `sword`, `claymore`, `polearm`, `bow`, `catalyst`",
            required: false,
            schema: { type: "string", example: "claymore" }
          },
          {
            name: "infoSize",
            in: "query",
            description: "Set to `full` to retrieve complete talent matrix and constellation scaling for each character.",
            required: false,
            schema: { type: "string", enum: ["standard", "full"], default: "standard" }
          }
        ],
        responses: {
          "200": {
            description: "Array of character objects",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Character" }
                }
              }
            }
          }
        }
      }
    },
    "/weapon": {
      get: {
        tags: ["Weapons"],
        summary: "Get Single Weapon",
        description: "Fetches a weapon by exact name or returns a random weapon if name is omitted.",
        parameters: [
          {
            name: "name",
            in: "query",
            description: "Weapon name (e.g. `wolfs-gravestone`, `mistsplitter-reforged`, `staff-of-homa`)",
            required: false,
            schema: { type: "string", example: "wolfs-gravestone" }
          },
          {
            name: "infoSize",
            in: "query",
            description: "Set to `full` to include all progression stat tables (Lv1-90 Base ATK and Substats) and awakened art.",
            required: false,
            schema: { type: "string", enum: ["standard", "full"], default: "standard" }
          }
        ],
        responses: {
          "200": {
            description: "Weapon object payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Weapon" }
              }
            }
          },
          "404": {
            description: "Weapon not found"
          }
        }
      }
    },
    "/weapons": {
      get: {
        tags: ["Weapons"],
        summary: "List All Weapons",
        description: "Retrieves an array of all weapons with rarity and weapon type filters.",
        parameters: [
          {
            name: "rarity",
            in: "query",
            description: "Filter by rarity: `5`, `4`, `3`, `2`, `1`",
            required: false,
            schema: { type: "integer", enum: [1, 2, 3, 4, 5], example: 5 }
          },
          {
            name: "type",
            in: "query",
            description: "Filter by weapon category: `sword`, `claymore`, `polearm`, `bow`, `catalyst` (alias: `family`)",
            required: false,
            schema: { type: "string", example: "claymore" }
          },
          {
            name: "family",
            in: "query",
            description: "Filter by weapon family: `sword`, `claymore`, `polearm`, `bow`, `catalyst`",
            required: false,
            schema: { type: "string", example: "claymore" }
          },
          {
            name: "infoSize",
            in: "query",
            description: "Set to `full` to include progression curves for all returned weapons.",
            required: false,
            schema: { type: "string", enum: ["standard", "full"], default: "standard" }
          }
        ],
        responses: {
          "200": {
            description: "Array of weapon objects",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Weapon" }
                }
              }
            }
          }
        }
      }
    },
    "/artifact": {
      get: {
        tags: ["Artifacts"],
        summary: "Get Single Artifact Set",
        description: "Fetches an artifact set by name or returns a random artifact set.",
        parameters: [
          {
            name: "name",
            in: "query",
            description: "Artifact set name (e.g. `crimson-witch-of-flames`, `viridescent-venerer`, `emblem-of-severed-fate`)",
            required: false,
            schema: { type: "string", example: "crimson-witch-of-flames" }
          },
          {
            name: "infoSize",
            in: "query",
            description: "Set to `full` to include all 5 pieces (Flower, Plume, Sands, Goblet, Circlet) with lore descriptions and icons.",
            required: false,
            schema: { type: "string", enum: ["standard", "full"], default: "standard" }
          }
        ],
        responses: {
          "200": {
            description: "Artifact set payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Artifact" }
              }
            }
          },
          "404": {
            description: "Artifact not found"
          }
        }
      }
    },
    "/artifacts": {
      get: {
        tags: ["Artifacts"],
        summary: "List All Artifact Sets",
        description: "Retrieves an array of all artifact sets.",
        parameters: [
          {
            name: "infoSize",
            in: "query",
            description: "Set to `full` to include piece lore and icons for all sets.",
            required: false,
            schema: { type: "string", enum: ["standard", "full"], default: "standard" }
          }
        ],
        responses: {
          "200": {
            description: "Array of artifact set objects",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Artifact" }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Character: {
        type: "object",
        properties: {
          name: { type: "string", example: "Diluc" },
          title: { type: "string", example: "The Dark Side of Dawn" },
          vision: { type: "string", example: "Pyro" },
          weapon: { type: "string", example: "Claymore" },
          region: { type: "string", example: "Mondstadt" },
          rarity: { type: "integer", example: 5 },
          birthday: { type: "string", example: "April 30th" },
          constellation: { type: "string", example: "Noctua" },
          affiliation: { type: "string", example: "Dawn Winery" },
          desc: { type: "string", example: "The tycoon of a winery empire in Mondstadt, unmatched in every possible way." },
          images: {
            type: "object",
            properties: {
              profile: { type: "string", example: "https://res.cloudinary.com/.../diluc.webp" },
              card: { type: "string", example: "https://res.cloudinary.com/.../diluc_card.webp" },
              gacha: { type: "string", example: "https://res.cloudinary.com/.../diluc_gacha.webp" }
            }
          },
          voiceActors: {
            type: "object",
            properties: {
              en: { type: "string", example: "Sean Chiplock" },
              jp: { type: "string", example: "Kensho Ono" },
              cn: { type: "string", example: "Ma Yang" },
              kr: { type: "string", example: "Choi Seung-hoon" }
            }
          },
          combatTalents: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", example: "Tempered Sword" },
                type: { type: "string", example: "Normal Attack" },
                description: { type: "string" },
                attributes: { type: "array", items: { type: "object" } }
              }
            }
          },
          constellations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                level: { type: "integer", example: 1 },
                name: { type: "string", example: "Conviction" },
                description: { type: "string" }
              }
            }
          }
        }
      },
      Weapon: {
        type: "object",
        properties: {
          name: { type: "string", example: "Wolf's Gravestone" },
          type: { type: "string", example: "Claymore" },
          rarity: { type: "integer", example: 5 },
          baseAtk: { type: "string", example: "46" },
          subStatType: { type: "string", example: "ATK" },
          baseSubStat: { type: "string", example: "10.8%" },
          passiveName: { type: "string", example: "Wolfish Tracker" },
          passive: { type: "string", example: "Increases Base ATK by 20%..." },
          region: { type: "string", example: "Mondstadt" },
          images: {
            type: "object",
            properties: {
              icon: { type: "string" },
              awakened: { type: "string" }
            }
          }
        }
      },
      Artifact: {
        type: "object",
        properties: {
          name: { type: "string", example: "Crimson Witch of Flames" },
          maxRarity: { type: "integer", example: 5 },
          twoPc: { type: "string", example: "Pyro DMG Bonus +15%" },
          fourPc: { type: "string", example: "Increases Overloaded and Burning DMG by 40%..." },
          pieces: {
            type: "object",
            properties: {
              flower: { type: "object", properties: { name: { type: "string" }, desc: { type: "string" }, icon: { type: "string" } } },
              plume: { type: "object", properties: { name: { type: "string" }, desc: { type: "string" }, icon: { type: "string" } } },
              sands: { type: "object", properties: { name: { type: "string" }, desc: { type: "string" }, icon: { type: "string" } } },
              goblet: { type: "object", properties: { name: { type: "string" }, desc: { type: "string" }, icon: { type: "string" } } },
              circlet: { type: "object", properties: { name: { type: "string" }, desc: { type: "string" }, icon: { type: "string" } } }
            }
          }
        }
      }
    }
  }
};
