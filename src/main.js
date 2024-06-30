const THE_CODE = {
  active: false,
  pos: 0,
  code: [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a',
  ],
}
const FILE_URI = './data.gzip'
let SETS = []
let BULK_DATA = []
let DATA = []
const DATA_AGGREGATED = {
  byPrice: {
    lowest: [],
    highest: [],
  },
}
const FILTERS = {
  pricingType: 'all',
  basicLands: true,
  minimumPrice: 0.0,
  rarities: {
    common: true,
    uncommon: true,
    rare: true,
    mythic: true,
  },
  formats: {
    standard: true,
    pioneer: true,
    modern: true,
    legacy: true,
    commander: true,
    pauper: true,
  },
  _getSelectedEntriesOf(object) {
    const result = []
    for (const [key, selected] of Object.entries(object)) {
      if (selected) {
        result.push(key)
      }
    }
    return result
  },
  get selected_rarities() {
    return this._getSelectedEntriesOf(FILTERS.rarities)
  },
  get selected_formats() {
    return this._getSelectedEntriesOf(FILTERS.formats)
  },
}
const CARD_DATA = []
const RESULTS = {
  _cards: [],
  add(card) {
    this._cards.push(card)
  },
  get winRate() {
    const wins = this._cards.filter(
      (card) => card.status === STATUS_SUCCESS,
    ).length
    const draws = this._cards.filter(
      (card) => card.status === STATUS_DRAW,
    ).length
    return wins / (this._cards.length - draws) || 0
  },
}
const STATUS_SUCCESS = 'success'
const STATUS_DRAW = 'draw'
const STATUS_FAILURE = 'failure'
const RESULT_STATUSES = {
  STATUS_SUCCESS,
  STATUS_DRAW,
  STATUS_FAILURE,
}
const MODES = {
  usd: '$',
  eur: '€',
}
let MODE = 0

function getCurrency() {
  return Object.keys(MODES).at(MODE)
}

function updateMode() {
  const currency = getCurrency()
  document
    .querySelector(':root')
    .style.setProperty('--mode', '"' + MODES[currency] + '"')
  renderPrices()
}
function toggleMode() {
  // flip between 0 and 1
  MODE = 1 - MODE
  updateMode()
}

async function getBulkData() {
  const response = await fetch(FILE_URI, {
    method: 'GET',
    credentials: 'include',
    mode: 'no-cors',
  })
  const blob = await response.blob()
  const stream = blob.stream()
  const decompressed = stream.pipeThrough(new DecompressionStream('gzip'))
  return new Response(decompressed).json()
}

function getRandomCardIndex(butNotThisOne = null) {
  const index = Math.floor(Math.random() * DATA.length)
  if (index === butNotThisOne) {
    console.log("We hit the same card twice!? Let's try that again...")
    return getRandomCardIndex(butNotThisOne)
  }
  return index
}

function replayAnimations(element) {
  element.getAnimations().forEach((anim) => {
    anim.cancel()
    anim.play()
  })
}

function loadCard(id = 0, butNotThatIndex) {
  const element = document.getElementById('card-' + id)
  const img = element.querySelector('img')
  const index = getRandomCardIndex(butNotThatIndex)
  const card = DATA[index]
  CARD_DATA[id] = card
  element.classList.add('loading')
  img.addEventListener('load', () => {
    element.classList.remove('loading')
  })
  img.addEventListener('click', () => answer(id))
  img.alt = card.name
  img.src = card.img_uri
  replayAnimations(element)
  return index
}

function cardsLoaded() {
  return (
    document.querySelectorAll('.card:not(.loading) img:not([src=""])')
      .length === 2
  )
}

function getCardStatus(selectedCard, otherCard) {
  if (
    !selectedCard.hasOwnProperty('prices') ||
    !otherCard.hasOwnProperty('prices')
  ) {
    throw new Error('Missing prices on card objects.')
  }
  const currency = getCurrency()
  return Number(selectedCard.prices[currency]) >
    Number(otherCard.prices[currency])
    ? STATUS_SUCCESS
    : Number(selectedCard.prices[currency]) ===
        Number(otherCard.prices[currency])
      ? STATUS_DRAW
      : STATUS_FAILURE
}

function evaulateAnswer(id) {
  const selectedCard = CARD_DATA[id]
  const otherCard = CARD_DATA[1 - id]
  if (
    !selectedCard.hasOwnProperty('prices') ||
    !otherCard.hasOwnProperty('prices')
  ) {
    throw new Error('Missing prices on card objects.')
  }
  const resultObject = {
    name: selectedCard.name,
    url: selectedCard.scryfall_uri,
    status: getCardStatus(selectedCard, otherCard),
    versus: { name: otherCard.name, url: otherCard.scryfall_uri },
  }
  RESULTS.add(resultObject)
  return resultObject
}

function renderSetInfos() {
  CARD_DATA.forEach((card, i) => {
    if (!card.hasOwnProperty('set')) return
    const field = document.getElementById('set-info-' + i)
    field.querySelector('img').src = SETS.find(
      (el) => el.code == card.set.code,
    ).icon
    field.querySelector('img').className = 'set-' + card.rarity
    field.querySelector('.value').textContent =
      `${card.set.name} (${card.set.code})`
  })
}

function renderPrices() {
  CARD_DATA.forEach((card, i) => {
    if (!card.hasOwnProperty('prices')) return
    const field = document.getElementById('prices-' + i).querySelector('.price')
    field.textContent = card.prices[Object.keys(MODES).at(MODE)]
    const cheatPrices = document.getElementById('cheat-prices-' + i)
    Object.keys(MODES).forEach((currency) => {
      cheatPrices.querySelector('.' + currency + ' .cheat-price').innerText =
        card.prices[currency]
    })
    if (THE_CODE.active)
      document
        .getElementById('cheat-data')
        .classList.remove('display-none', 'hidden')
  })
}

function showResults(id, result) {
  renderPrices()
  document.getElementById('card-' + id).classList.add(result.status)
  document.querySelector('main').classList.add('results')
}

function resultIsActive() {
  return document.querySelector('main').classList.contains('results')
}

function updateResultList() {
  document.getElementById('result-list').classList.remove('hidden')
  document.getElementById('win-rate-score').innerText =
    (RESULTS.winRate * 100).toFixed(2) + '%'
  document.getElementById('win-rate').classList.remove('hidden')
}

function answer(id) {
  if (!cardsLoaded() || resultIsActive()) return
  deactivateAnswers()
  deactivateModeToggle()
  const result = evaulateAnswer(id)
  showResults(id, result)
  addResultListItem(result)
  setTimeout(() => {
    activateResetButton()
    updateResultList()
  }, 100)
}

function addResultListItem(result) {
  const template = document.getElementById('list-row')
  const row = template.content.cloneNode(true)
  row.querySelector('.status-icon').classList.add(result.status)
  const link0 = row.querySelector('.link-0')
  link0.innerText = result.name.split('//')[0]
  link0.href = result.url
  const link1 = row.querySelector('.link-1')
  link1.innerText = result.versus.name.split('//')[0]
  link1.href = result.versus.url
  row
    .querySelector('.expand')
    .addEventListener('mousedown', (e) =>
      e.target.closest('.list-item').classList.toggle('checked'),
    )
  document.querySelector('#result-list .list-body').prepend(row)
}

function activateModeToggle() {
  const modeToggle = document.getElementById('mode-toggle')
  modeToggle.classList.add('active')
  modeToggle.addEventListener('mousedown', toggleMode)
}

function deactivateModeToggle() {
  const modeToggle = document.getElementById('mode-toggle')
  modeToggle.classList.remove('active')
  modeToggle.removeEventListener('mousedown', toggleMode)
}

function activateAnswers() {
  document.querySelectorAll('.card').forEach((e) => e.classList.add('active'))
}
function deactivateAnswers() {
  document.querySelectorAll('.card').forEach((e) => {
    e.classList.remove('active')
    e.querySelector('img').removeEventListener('click', answer)
  })
}

function activateResetButton() {
  document.getElementById('reset-btn').addEventListener('click', reset)
  document.getElementById('reset-btn').classList.remove('hidden')
}
function deactivateResetButton() {
  document.getElementById('reset-btn').removeEventListener('click', reset)
  document.getElementById('reset-btn').classList.add('hidden')
}

function reset() {
  if (!cardsLoaded()) return
  deactivateResetButton()
  document.querySelector('main').classList.remove('results')
  document.querySelectorAll('.card').forEach((e) => {
    e.classList.remove(...Object.values(RESULT_STATUSES))
    e.querySelector('img').src = ''
  })
  document.getElementById('cheat-data').classList.add('hidden')
  setup()
}

function setup() {
  activateModeToggle()
  const firstCardIndex = loadCard(0)
  loadCard(1, firstCardIndex)
  activateAnswers()
  renderSetInfos()
  renderPrices()
}

function showCheatmodeEnabled() {
  const cheatInfo = document.createElement('span')
  cheatInfo.id = 'cheatmode'
  cheatInfo.innerText = 'Cheat Mode Activated!'
  document.querySelector('main').prepend(cheatInfo)
  Object.keys(MODES).forEach((key) =>
    document
      .querySelectorAll('.' + key)
      .forEach((item) =>
        item.style.setProperty('--mode', '"' + MODES[key] + '"', 'important'),
      ),
  )
  THE_CODE.active = true
  renderPrices()
}

function handleTheCode(e) {
  THE_CODE.pos = e.key === THE_CODE.code[THE_CODE.pos] ? THE_CODE.pos + 1 : 0
  if (THE_CODE.pos === THE_CODE.code.length) {
    if (!THE_CODE.active) {
      showCheatmodeEnabled()
    }
    window.removeEventListener('keydown', handleTheCode)
  }
}

function handleKeyDown(e) {
  if (e.key === 'Shift') {
    document
      .querySelectorAll('kbd.key')
      .forEach((item) => item.classList.remove('display-none'))
  }
}
function handleKeyUp(e) {
  switch (e.key) {
    case 'Shift':
      document
        .querySelectorAll('kbd.key')
        .forEach((item) => item.classList.add('display-none'))
      break
    case 'c':
      document
        .querySelector('#mode-toggle')
        .dispatchEvent(new Event('mousedown'))
      break
    case 'f':
      document.querySelector('#settings-button').click()
      break
    case '1':
      document.querySelector('#card-0 img').click()
      break
    case '2':
      document.querySelector('#card-1 img').click()
      break
    case 'Enter':
      document.querySelector('#reset-btn').click()
      break
    case 'Escape':
      document.querySelector('#settings-close').click()
      break
  }
}

function generateBGitems() {
  const parentNode = document.createElement('div')
  parentNode.id = 'bg-items'
  for (let i = 0; i < 8; i += 2) {
    for (let x = 0; x < 8; x++) {
      const y = x % 2 === 0 ? i + 1 : i
      const item = document.createElement('div')
      item.style.setProperty('--pos-x', x.toString())
      item.style.setProperty('--pos-y', y.toString())
      parentNode.appendChild(item)
    }
  }
  document.querySelector('html').appendChild(parentNode)
}

function wireUpButtons() {
  document
    .getElementById('cheat-btn')
    .addEventListener('click', showCheatmodeEnabled)
  const settingsElement = document.getElementById('settings')
  document.getElementById('settings-button').addEventListener('click', () => {
    settingsElement.classList.add('open')
  })
  document.getElementById('settings-close').addEventListener('click', () => {
    settingsElement.classList.remove('open')
  })
}

function wireUpSettings() {
  const minPriceSlider = document.getElementById('min-price-slider')
  minPriceSlider.addEventListener('input', (ev) => {
    document.querySelector('#min-price-val .value').innerText = Number(
      ev.target.value,
    ).toFixed(2)
  })
  Array.from(['mouseup', 'touchend']).forEach((ev) =>
    minPriceSlider.addEventListener(ev, minimumPriceFilterHandler),
  )
  const basicLandsToggle = document.getElementById('toggle-basic-lands')
  basicLandsToggle.checked = FILTERS.basicLands
  basicLandsToggle.addEventListener('click', (ev) => {
    FILTERS.basicLands = ev.target.checked
    applyFilters()
  })
  document.querySelectorAll('#pricing-type input').forEach((radio) => {
    radio.checked = radio.value == FILTERS.pricingType
    radio.addEventListener('click', (ev) => {
      FILTERS.pricingType = ev.target.value
      applyFilters()
    })
  })
  document.querySelectorAll('#rarities input').forEach((checkbox) => {
    checkbox.checked = FILTERS.rarities[checkbox.value]
    checkbox.addEventListener('click', raritiesFilterHandler)
  })
  document.querySelectorAll('#formats input').forEach((checkbox) => {
    checkbox.checked = FILTERS.formats[checkbox.value]
    checkbox.addEventListener('click', formatsFilterHandler)
  })
}

function minimumPriceFilterHandler(ev) {
  const value = ev.target.value
  if (Number(value) == Number(FILTERS.minimumPrice)) return
  FILTERS.minimumPrice = value
  applyFilters()
}

function raritiesFilterHandler(ev) {
  const checked = ev.target.checked
  FILTERS.rarities[ev.target.value] = checked
  keepLastToggleInGroupActive('rarities', checked)
  applyFilters()
}

function formatsFilterHandler(ev) {
  const checked = ev.target.checked
  FILTERS.formats[ev.target.value] = checked
  keepLastToggleInGroupActive('formats', checked)
  applyFilters()
}

function applyFilters() {
  const currency = getCurrency()
  const allFiltersFunc = (el) => {
    return (
      Number(el.prices[currency]) >= Number(FILTERS.minimumPrice) &&
      isLegal(el.legalities) &&
      (FILTERS.basicLands || !el.isBasicLand) &&
      FILTERS.rarities[el.rarity]
    )
  }
  DATA =
    FILTERS.pricingType == 'all'
      ? BULK_DATA.filter(allFiltersFunc)
      : DATA_AGGREGATED.byPrice[FILTERS.pricingType].filter(allFiltersFunc)
  reset()
}

function isLegal(cardLegalities) {
  return (
    FILTERS.selected_formats.filter(
      (format) => cardLegalities[format] == 'legal',
    ).length > 0
  )
}

function isBasicLand(cardName) {
  const landNames = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
  return landNames.includes(cardName)
}

function keepLastToggleInGroupActive(groupName, checked) {
  switch (FILTERS[`selected_${groupName}`].length) {
    case 1:
      document.querySelector(`#${groupName} input:checked`).disabled = true
      break
    case 2:
      if (checked) {
        document.querySelector(`#${groupName} input:disabled`).disabled = false
      }
      break
  }
  updateMythicPauperMode()
}

function updateMythicPauperMode() {
  const status =
    document.getElementById('toggle-mythic').disabled &&
    document.getElementById('toggle-pauper').disabled
  document
    .querySelectorAll('.mythic-pauper-mode')
    .forEach((el) => el.classList.toggle('engaged', status))
  document.getElementById('sick-track').pause()
}

function prepareData(fetchedData) {
  SETS = fetchedData.sets
  BULK_DATA = fetchedData.data.map((card) => {
    card.isBasicLand = isBasicLand(card.name)
    return card
  })
  DATA = BULK_DATA

  const currency = getCurrency()
  let result = { lowest: {}, highest: {} }
  for (const [idx, card] of Object.entries(DATA)) {
    const price = Number(card.prices[currency])
    if (!result.lowest[card.name] || price < result.lowest[card.name].price) {
      result.lowest[card.name] = { index: Number(idx), price }
    }
    if (!result.highest[card.name] || price > result.highest[card.name].price) {
      result.highest[card.name] = { index: Number(idx), price }
    }
  }
  DATA_AGGREGATED.byPrice = {
    lowest: Array.from(Object.values(result.lowest)).map(
      (value) => BULK_DATA[value.index],
    ),
    highest: Array.from(Object.values(result.highest)).map(
      (value) => BULK_DATA[value.index],
    ),
  }
}

window.addEventListener('load', () => {
  generateBGitems()
  document.querySelector('audio').volume = 0.5
  getBulkData().then((fetchedData) => {
    prepareData(fetchedData)
    wireUpButtons()
    wireUpSettings()
    updateMode()
    setup()
    window.addEventListener('keydown', handleTheCode)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  })
})

let resizeTimeout = false
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    const bgItems = document.getElementById('bg-items')
    bgItems.remove()
    document.querySelector('html').appendChild(bgItems)
  }, 50)
})
