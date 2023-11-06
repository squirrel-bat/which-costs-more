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
let DATA = []
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
    return wins / (this._cards.length - draws)
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

async function getBulkData() {
  const response = await fetch(FILE_URI, {
    method: 'GET',
    credentials: 'include',
    mode: 'no-cors',
  })
  const blob = await response.blob()
  const stream = await blob.stream()
  const decompressed = await stream.pipeThrough(new DecompressionStream('gzip'))
  return new Response(decompressed).json()
}

function getRandomCardIndex(butNotThisOne = null) {
  const index = Math.floor(Math.random() * DATA.length)
  if (index === butNotThisOne) {
    console.log("We hit the same index twice!? Let's try that again.")
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
  img.src = card['img_uri']
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
  const currency = Object.keys(MODES).at(MODE)
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
    url: selectedCard['scryfall_uri'],
    status: getCardStatus(selectedCard, otherCard),
    versus: { name: otherCard.name, url: otherCard['scryfall_uri'] },
  }
  RESULTS.add(resultObject)
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
  renderPrices()
}

function handleTheCode(e) {
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
    window.removeEventListener('keydown', handleTheCode)
  }
}

function cheat() {
  THE_CODE.active = true
  renderPrices()
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
    case '1':
      document.querySelector('#card-0 img').click()
      break
    case '2':
      document.querySelector('#card-1 img').click()
      break
    case 'Enter':
      document.querySelector('#reset-btn').click()
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

window.addEventListener('load', () => {
  generateBGitems()
  getBulkData().then((bulkData) => {
    DATA = bulkData
    window.addEventListener('keydown', handleTheCode)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    document.getElementById('cheat-btn').addEventListener('click', cheat)
    updateMode()
    setup()
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
