// Il disco di lavoro e' exFAT: macOS scrive un «._nome» accanto a ogni file.
// Expo Router prenderebbe «src/app/._index.tsx» per una schermata, e il
// bundle si ferma su un file binario. Metro non deve vederli.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const appleDouble = /(^|[\\/])\._[^\\/]*$/
const esistenti = config.resolver.blockList
config.resolver.blockList = [...(Array.isArray(esistenti) ? esistenti : esistenti ? [esistenti] : []), appleDouble]

module.exports = config
