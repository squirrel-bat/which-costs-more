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
const API_URL =
  'https://api.scryfall.com/cards/random?q=usd%3E%3D0.01+eur%3E%3D0.01+game%3Dpaper+is%3Anonfoil'
const IMG_SIZE = 'normal'
const CARD_DATA = []
const RESULTS = []
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

function updateMode() {
  const currency = Object.keys(MODES).at(MODE)
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

async function getRandomCard() {
  return await fetch(API_URL).then((r) => {
    return r.json()
  })
}

function replayAnimations(element) {
  element.getAnimations().forEach((anim) => {
    anim.cancel()
    anim.play()
  })
}

function loadCard(id = 0) {
  const element = document.getElementById('card-' + id)
  const img = element.querySelector('img')
  img.src = ''
  return getRandomCard()
    .then((card) => {
      if (
        !card.hasOwnProperty('image_uris') ||
        !card.hasOwnProperty('prices')
      ) {
        console.log('Card is missing data, fetching new one...')
        return loadCard(id)
      }
      CARD_DATA[id] = card
      img.alt = card.name
      img.src = card.image_uris[IMG_SIZE]
      img.addEventListener('click', () => answer(id))
      replayAnimations(element)
    })
    .catch(console.error)
}

function cardsLoaded() {
  return document.querySelectorAll('.card img:not([src=""])').length === 2
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
  const currency = Object.keys(MODES).at(MODE)
  const resultObject = {
    name: selectedCard.name,
    url: selectedCard['scryfall_uri'],
    status:
      Number(selectedCard.prices[currency]) > Number(otherCard.prices[currency])
        ? STATUS_SUCCESS
        : selectedCard.prices[currency] === otherCard.prices[currency]
        ? STATUS_DRAW
        : STATUS_FAILURE,
  }
  RESULTS.push(resultObject)
  return resultObject
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

function answer(id) {
  if (!cardsLoaded() || resultIsActive()) return
  deactivateAnswers()
  deactivateModeToggle()
  const result = evaulateAnswer(id)
  showResults(id, result)
  document.getElementById('result-list').classList.remove('hidden')
  addResultListItem(result)
  activateResetButton()
}

function addResultListItem(result) {
  const a = document.createElement('a')
  a.target = '_blank'
  a.href = result.url
  a.innerText = result.name
  const span = document.createElement('span')
  span.classList.add(result.status)
  const div = document.createElement('div')
  div.classList.add('list-item')
  div.append(span, a)
  document.querySelector('#result-list .list-body').prepend(div)
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
  document
    .querySelectorAll('.card')
    .forEach((e) => e.classList.remove('active'))
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
  loadCard(0)
    // might have to insert a timeout between these to stay above the minimum delay for calls to the Scryfall API
    .then(() => loadCard(1))
    .then(() => {
      activateAnswers()
      renderPrices()
    })
}

function handleKeys(e) {
  THE_CODE.pos = e.key === THE_CODE.code[THE_CODE.pos] ? THE_CODE.pos + 1 : 0
  if (THE_CODE.pos === THE_CODE.code.length) {
    if (!THE_CODE.active) {
      const cheatInfo = document.createElement('span')
      cheatInfo.id = 'cheatmode'
      cheatInfo.innerText = 'Cheat Mode Activated!'
      document.getElementById('title').prepend(cheatInfo)
      Object.keys(MODES).forEach((key) =>
        document
          .querySelectorAll('.' + key)
          .forEach((item) =>
            item.style.setProperty(
              '--mode',
              '"' + MODES[key] + '"',
              'important',
            ),
          ),
      )
    }
    THE_CODE.active = true
    renderPrices()
    window.removeEventListener('keydown', handleKeys)
  }
}

function cheat() {
  THE_CODE.active = true
  renderPrices()
}

window.addEventListener('keydown', handleKeys)
window.onload = () => {
  document.getElementById('cheat-btn').addEventListener('click', cheat)
  updateMode()
  setup()
}
