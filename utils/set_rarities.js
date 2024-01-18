const fs = require("fs");
const basePath = process.cwd();
const { layerConfigurations } = require(`${basePath}/src/config.js`);
const { getElements } = require("../src/main.js");
const { rarityRanges } = require("../src/config.js");
const { getRarityScores, groupByRarity } = require('../src/rarities.js');
const Table = require("cli-table");
const path = require('path')

const layersDir = `${basePath}/layers`;

// read json data
const rawdata = fs.readFileSync(path.join(basePath, "build", "json", "_metadata.json"));
const data = JSON.parse(rawdata);

const rarityScores = getRarityScores(
  data,
  rarityRanges,
  layerConfigurations,
  (layerName) => getElements(`${layersDir}/${layerName}/`))

const rarityGroups = groupByRarity(rarityScores)

const itemsTable = new Table({
  head: ['Item', 'Id', 'RarityRank', 'RarityLabel'],
  colWidths: [30, 20, 20, 20]
});

rarityScores.forEach((rarityScore) => {
  itemsTable.push([
    rarityScore.element.name,
    rarityScore.element.edition,
    rarityScore.score,
    rarityScore.nextItem.rarity
  ])
})

itemsTable.sort((a, b) => (a[2] > b[2]) ? -1 : 1)

const raritiesTable = new Table({
  head: ['Label', 'Items amount', 'Range'],
  colWidths: [30, 20, 50]
});

Object.entries(rarityGroups).forEach(([rarityLabel, rarityGroup]) => {
  raritiesTable.push([
    rarityLabel,
    rarityGroup.length,
    rarityRanges[rarityLabel].join('...'),
  ])
})

raritiesTable.sort((a, b) => (a[1] > b[1]) ? 1 : -1)

console.log(itemsTable.toString())
console.log(raritiesTable.toString())

console.log("[x] Updating metadata...")

rarityScores.forEach((element) => {
  fs.writeFileSync(
    path.join(
      basePath,
      "build",
      "json",
      `${element.element.edition}.json`
    ),

    JSON.stringify(element.nextItem, null, 2)
  )
})

console.log("[x] Done!") 