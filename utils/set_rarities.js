const basePath = process.cwd();
const fs = require("fs");
const layersDir = `${basePath}/layers`;

const { layerConfigurations } = require(`${basePath}/src/config.js`);

const { getElements } = require("../src/main.js");
const { rarityRanges } = require("../src/config.js");

// read json data
let rawdata = fs.readFileSync(`${basePath}/build/json/_metadata.json`);
let data = JSON.parse(rawdata);
let editionSize = data.length;

let rarityData = [];

// intialize layers to chart
layerConfigurations.forEach((config) => {
  let layers = config.layersOrder;

  layers.forEach((layer) => {
    // get elements for each layer
    let elementsForLayer = [];
    let elements = getElements(`${layersDir}/${layer.name}/`);
    elements.forEach((element) => {
      // just get name and weight for each element
      let rarityDataElement = {
        trait: element.name,
        weight: element.weight.toFixed(0),
        occurrence: 0, // initialize at 0
      };
      elementsForLayer.push(rarityDataElement);
    });
    let layerName =
      layer.options?.["displayName"] != undefined
        ? layer.options?.["displayName"]
        : layer.name;
    // don't include duplicate layers
    if (!rarityData.includes(layer.name)) {
      // add elements for each layer to chart
      rarityData[layerName] = elementsForLayer;
    }
  });
});

// fill up rarity chart with occurrences from metadata
data.forEach((element) => {
  let attributes = element.attributes;
  attributes.forEach((attribute) => {
    let traitType = attribute.trait_type;
    let value = attribute.value;

    let rarityDataTraits = rarityData[traitType];
    rarityDataTraits.forEach((rarityDataTrait) => {
      if (rarityDataTrait.trait == value) {
        // keep track of occurrences
        rarityDataTrait.occurrence++;
      }
    });
  });
});

// convert occurrences to occurence string
for (var layer in rarityData) {
  for (var attribute in rarityData[layer]) {
    // get chance
    let chance =
      ((rarityData[layer][attribute].occurrence / editionSize) * 100).toFixed(2);

    // show two decimal places in percent
    rarityData[layer][attribute].occurrence =
      `${rarityData[layer][attribute].occurrence} in ${editionSize} editions (${chance} %)`;

    rarityData[layer][attribute].chance = chance / 100;
  }
}

// print out rarity data
console.log("===========================\n");
console.log("Traits Rarity Data ========");
console.log("===========================\n");

for (var layer in rarityData) {
  console.log(`Trait type: ${layer}`);
  for (var trait in rarityData[layer]) {
    console.log(rarityData[layer][trait]);
  }
  console.log();
}

// output a sorted list by NFT rarity score
NFTrarity = []
data.forEach((element) => {
  score = 0;
  element.attributes.forEach((attrib) => {
    layer = rarityData[attrib["trait_type"]];
    objIndex = layer.findIndex((meta => meta.trait == attrib["value"]));
    trait = layer[objIndex];

    // 0 <= chance <= 1 (0.2)
    // chance higher -> score less
    // chance lower -> score higher
    // score higher -> more uniq work
    score = score + 1 / trait.chance;
  });

  NFTrarity.push({
    "element": element,
    "score": score
  });
});

console.log("NFT Rarity Ranking ========");
console.log("===========================");
NFTrarity.sort((a, b) => (a.score > b.score) ? -1 : 1);

const getItemRarityLabel = (score) => {
  const foundRarity = Object.entries(rarityRanges).find(([rName, rRange]) => {
    return rRange[0] <= score && rRange[1] >= score
  })

  if (!foundRarity) {
    throw new Error('For item with score ' + score + ' no rarity work defined')
  }

  return foundRarity[0]
}

NFTrarity.forEach((element) => {
  let rarity = getItemRarityLabel(element.score)

  let nextItem = {
    ...element.element,
    rarity,
    attributes: [
      ...element.element.attributes.filter(x => x.trait_type !== 'Rarity'),
      {
        'trait_type': 'Rarity',
        'value': rarity
      }
    ]
  }

  console.log(`Updating rarity for element ${element.element.edition}, score = ${element.score} (${rarity})`)

  fs.writeFileSync(
    `${basePath}/build/json/${element.element.edition}.json`,
    JSON.stringify(nextItem, null, 2)
  )
});