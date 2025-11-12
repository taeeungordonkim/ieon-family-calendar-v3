const STORAGE_KEY = 'family-calendar-events-v1';
const START_YEAR = 2025;
const START_MONTH = 10; // 0-indexed, 10 => November

const CATEGORIES = {
  yunhee: { label: '윤희', colorVar: '--yunhee' },
  eon: { label: '이언', colorVar: '--eon' },
  taeeun: { label: '태은', colorVar: '--taeeun' },
  ando: { label: '안도', colorVar: '--ando' },
  family: { label: '가족', colorVar: '--family' },
  etc: { label: '기타', colorVar: '--etc' }
};

const RECURRING_EVENTS = [
  { id: 'rec-yunhee-birthday', title: '윤희 생일', category: 'yunhee', type: 'solar', month: 5, day: 7, order: 10 },
  { id: 'rec-eon-birthday', title: '이언 생일', category: 'eon', type: 'solar', month: 3, day: 29, order: 20 },
  { id: 'rec-taeeun-birthday', title: '태은 생일', category: 'taeeun', type: 'solar', month: 5, day: 12, order: 30 },
  { id: 'rec-wedding-anniversary', title: '결혼 기념일', category: 'family', type: 'solar', month: 2, day: 21, order: 40 },
  { id: 'rec-ando-birthday', title: '안도 생일', category: 'ando', type: 'solar', month: 3, day: 2, order: 50 },
  { id: 'rec-daegu-grandma-birthday', title: '대구 할머니 생신', category: 'family', type: 'solar', month: 8, day: 24, order: 60 },
  { id: 'rec-daegu-grandpa-memorial', title: '대구 할아버지 기일', category: 'family', type: 'lunar', month: 2, day: 28, order: 70 },
  { id: 'rec-gangneung-grandpa-birthday', title: '강릉 할아버지 생신', category: 'family', type: 'lunar', month: 9, day: 24, order: 80 },
  { id: 'rec-gangneung-grandma-birthday', title: '강릉 할머니 생신', category: 'family', type: 'solar', month: 12, day: 9, order: 90 },
  { id: 'rec-gangneung-uncle-birthday', title: '강릉 외삼촌 생일', category: 'family', type: 'solar', month: 10, day: 1, order: 100 },
  { id: 'rec-daegu-aunt-birthday', title: '대구 고모 생일', category: 'family', type: 'solar', month: 4, day: 26, order: 110 }
];

const RECURRING_EVENT_IDS = new Set(RECURRING_EVENTS.map((event) => event.id));

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

const solarHolidays = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절' },
  { month: 5, day: 5, name: '어린이날' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절' },
  { month: 10, day: 3, name: '개천절' },
  { month: 10, day: 9, name: '한글날' },
  { month: 12, day: 25, name: '성탄절' }
];

const lunarFormatter = new Intl.DateTimeFormat('ko-u-ca-chinese', {
  month: 'numeric',
  day: 'numeric'
});

const weekdayRow = document.getElementById('weekday-row');
const dateGrid = document.getElementById('date-grid');
const currentMonthLabel = document.getElementById('current-month-label');

const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const shareBtn = document.getElementById('share-link-btn');
const exportBtn = document.getElementById('export-json-btn');
const importBtn = document.getElementById('import-json-btn');
const importInput = document.getElementById('import-json-input');

const modal = document.getElementById('event-modal');
const modalCloseBtn = document.getElementById('modal-close');
const modalDateLabel = document.getElementById('modal-date-label');
const eventForm = document.getElementById('event-form');
const eventCategorySelect = document.getElementById('event-category');
const eventTitleInput = document.getElementById('event-title');
const eventNotesInput = document.getElementById('event-notes');
const eventImageInput = document.getElementById('event-image');
const eventImageStatus = document.getElementById('event-image-status');
const eventImageRemove = document.getElementById('event-image-remove');
const eventListEl = document.getElementById('event-list');
const deleteAllBtn = document.getElementById('delete-all-btn');

const template = document.getElementById('event-item-template');
const saveButton = eventForm.querySelector('.primary');

const state = {
  currentDate: new Date(START_YEAR, START_MONTH, 1),
  events: {},
  selectedDate: null,
  editingEventId: null
};

init();

function init() {
  renderWeekdays();
  loadEvents();
  attachEventListeners();
  renderCalendar();
}

function renderWeekdays() {
  weekdayRow.innerHTML = '';
  WEEKDAYS.forEach((label) => {
    const span = document.createElement('span');
    span.textContent = label;
    weekdayRow.appendChild(span);
  });
}

function attachEventListeners() {
  prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  nextMonthBtn.addEventListener('click', () => changeMonth(1));

  shareBtn.addEventListener('click', handleShareLink);
  exportBtn.addEventListener('click', handleExport);
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', handleImport);

  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hasAttribute('hidden')) {
      closeModal();
    }
  });

  eventForm.addEventListener('submit', handleEventSubmit);
  deleteAllBtn.addEventListener('click', handleDeleteAll);
  eventImageInput.addEventListener('change', handleImageInputChange);
  eventImageRemove.addEventListener('change', handleImageRemoveChange);
}

function loadEvents() {
  const urlEvents = parseEventsFromUrl();
  if (urlEvents) {
    state.events = urlEvents;
    persistEvents();
    return;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      state.events = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('저장된 일정 데이터를 불러오지 못했습니다.', error);
  }
}

function persistEvents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  } catch (error) {
    console.warn('일정 데이터를 저장하지 못했습니다.', error);
  }
}

function parseEventsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');
  if (!dataParam) return null;

  try {
    const decoded = decodeShareString(dataParam);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('공유 링크에서 데이터를 읽을 수 없습니다.', error);
  }
  return null;
}

function encodeShareData(events) {
  const json = JSON.stringify(events);
  return encodeShareString(json);
}

function changeMonth(offset) {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  state.currentDate = new Date(year, month + offset, 1);
  renderCalendar();
}

function renderCalendar() {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  currentMonthLabel.textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const totalCells = 42;

  const today = new Date();
  const todayKey = toISODate(today);

  dateGrid.innerHTML = '';

  for (let i = 0; i < totalCells; i += 1) {
    const cellDate = new Date(year, month, 1 - startOffset + i);
    const cellMonth = cellDate.getMonth();
    const isCurrentMonth = cellMonth === month;
    const isoKey = toISODate(cellDate);

    const { lunarDay, lunarMonth } = getLunarInfo(cellDate);
    const lunarBadge = lunarDay === 1 || lunarDay === 10 || lunarDay === 20;

    const holidays = getHolidays(cellDate, { lunarDay, lunarMonth });

    const allEvents = getCombinedEventsForDate(isoKey, cellDate, { lunarDay, lunarMonth });

    const cell = document.createElement('div');
    cell.classList.add('day-cell');
    if (!isCurrentMonth) cell.classList.add('other-month');
    if (isoKey === todayKey) cell.classList.add('today');

    const dayOfWeek = cellDate.getDay();
    if (isCurrentMonth) {
      if (dayOfWeek === 6) cell.classList.add('saturday');
      if (dayOfWeek === 0) cell.classList.add('sunday');
      if (holidays.length > 0) cell.classList.add('holiday-day');
    }

    const dateLabel = document.createElement('div');
    dateLabel.classList.add('date-label');

    const gregorianSpan = document.createElement('span');
    gregorianSpan.classList.add('gregorian');
    gregorianSpan.textContent = String(cellDate.getDate());
    dateLabel.appendChild(gregorianSpan);

    if (lunarBadge && lunarMonth) {
      const lunarSpan = document.createElement('span');
      lunarSpan.classList.add('lunar');
      lunarSpan.textContent = `음 ${lunarMonth}월 ${lunarDay}일`;
      dateLabel.appendChild(lunarSpan);
    }

    const overlayButton = document.createElement('button');
    overlayButton.type = 'button';
    overlayButton.classList.add('add-overlay');
    overlayButton.dataset.date = isoKey;
    overlayButton.setAttribute(
      'aria-label',
      `${cellDate.getFullYear()}년 ${cellDate.getMonth() + 1}월 ${cellDate.getDate()}일 일정 추가`
    );
    overlayButton.addEventListener('click', () => openModal(isoKey));

    const badgesContainer = document.createElement('div');
    badgesContainer.classList.add('badges');
    holidays.forEach((holiday) => {
      const badge = document.createElement('span');
      badge.classList.add('badge');
      badge.textContent = holiday;
      badgesContainer.appendChild(badge);
    });

    const eventsContainer = document.createElement('div');
    eventsContainer.classList.add('events');
    allEvents.forEach((event) => {
      const chip = document.createElement('span');
      chip.classList.add('event-chip');
      if (event.isRecurring) chip.classList.add('recurring');
      if (event.imageData) chip.classList.add('has-image');
      chip.style.backgroundColor = getCategoryColor(event.category);
      chip.title = event.isRecurring ? `${event.title} · 반복 일정` : event.title;

      const label = document.createElement('span');
      label.textContent = event.title;
      chip.appendChild(label);
      eventsContainer.appendChild(chip);
    });

    cell.appendChild(dateLabel);
    if (holidays.length > 0) {
      cell.appendChild(badgesContainer);
    }
    if (allEvents.length > 0) {
      cell.appendChild(eventsContainer);
    }
    cell.appendChild(overlayButton);

    dateGrid.appendChild(cell);
  }
}

function getCategoryColor(categoryKey) {
  const root = document.documentElement;
  const config = CATEGORIES[categoryKey];
  if (!config) return 'var(--border)';
  const value = getComputedStyle(root).getPropertyValue(config.colorVar);
  return value || 'var(--border)';
}

function getLunarInfo(date) {
  const parts = lunarFormatter.formatToParts(date);
  const monthPart = parts.find((part) => part.type === 'month');
  const dayPart = parts.find((part) => part.type === 'day');

  return {
    lunarMonth: monthPart ? Number(monthPart.value) : null,
    lunarDay: dayPart ? Number(dayPart.value) : null
  };
}

function getHolidays(date, lunarInfo) {
  const holidays = [];
  const month = date.getMonth() + 1;
  const day = date.getDate();

  solarHolidays.forEach((holiday) => {
    if (holiday.month === month && holiday.day === day) {
      holidays.push(holiday.name);
    }
  });

  const { lunarMonth, lunarDay } = lunarInfo;
  if (lunarMonth && lunarDay) {
    if (lunarMonth === 1 && lunarDay === 1) {
      holidays.push('설날');
    }
    if (lunarMonth === 12 && (lunarDay === 29 || lunarDay === 30)) {
      holidays.push('설날 연휴');
    }
    if (lunarMonth === 1 && lunarDay === 2) {
      holidays.push('설날 연휴');
    }
    if (lunarMonth === 4 && lunarDay === 8) {
      holidays.push('부처님오신날');
    }
    if (lunarMonth === 8 && lunarDay === 15) {
      holidays.push('추석');
    }
    if (lunarMonth === 8 && (lunarDay === 14 || lunarDay === 16)) {
      holidays.push('추석 연휴');
    }
  }

  return holidays;
}

function getCombinedEventsForDate(isoDate, dateObj, lunarInfo) {
  const recurring = getRecurringEventsForDate(dateObj, lunarInfo);
  const userEvents = (state.events[isoDate] || []).map((event) => ({
    ...event,
    isRecurring: false
  }));
  return sortEvents([...recurring, ...userEvents]);
}

function getRecurringEventsForDate(dateObj, lunarInfo) {
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  return RECURRING_EVENTS.filter((event) => {
    if (event.type === 'solar') {
      return event.month === month && event.day === day;
    }
    if (event.type === 'lunar') {
      return lunarInfo.lunarMonth === event.month && lunarInfo.lunarDay === event.day;
    }
    return false;
  }).map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category,
    notes: event.notes || '',
    isRecurring: true,
    order: event.order ?? 0
  }));
}

function sortEvents(events) {
  return events.slice().sort((a, b) => {
    if (a.isRecurring !== b.isRecurring) {
      return a.isRecurring ? -1 : 1;
    }
    if (a.isRecurring && b.isRecurring) {
      return (a.order ?? 0) - (b.order ?? 0);
    }
    const aCreated = a.createdAt ?? 0;
    const bCreated = b.createdAt ?? 0;
    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }
    return (a.title || '').localeCompare(b.title || '');
  });
}

function createEventObject({ category, title, notes, imageData }) {
  const event = {
    id: generateId(),
    category,
    title,
    createdAt: Date.now()
  };
  if (notes) {
    event.notes = notes;
  }
  if (imageData) {
    event.imageData = imageData;
  }
  return event;
}

function prepareNewEventForm() {
  state.editingEventId = null;
  saveButton.textContent = '저장';
  eventCategorySelect.value = '';
  eventTitleInput.value = '';
  eventNotesInput.value = '';
  eventImageInput.value = '';
  eventImageRemove.checked = false;
  eventImageRemove.disabled = true;
  setImageStatus('이미지가 첨부되지 않았습니다.');
}

function startEditingEvent(eventData) {
  state.editingEventId = eventData.id;
  saveButton.textContent = '수정 저장';
  eventCategorySelect.value = eventData.category;
  eventTitleInput.value = eventData.title;
  eventNotesInput.value = eventData.notes || '';
  eventImageInput.value = '';
  eventImageRemove.checked = false;
  eventImageRemove.disabled = !eventData.imageData;
  setImageStatus(eventData.imageData ? '기존 이미지가 첨부되어 있습니다.' : '이미지가 첨부되지 않았습니다.');
  renderEventList();
  eventCategorySelect.focus();
}

function setImageStatus(message) {
  if (eventImageStatus) {
    eventImageStatus.textContent = message;
  }
}

function handleImageInputChange() {
  const file = eventImageInput.files && eventImageInput.files[0] ? eventImageInput.files[0] : null;
  if (file) {
    setImageStatus(`선택된 이미지: ${file.name}`);
    eventImageRemove.checked = false;
    eventImageRemove.disabled = false;
  } else {
    const hasExistingImage = state.editingEventId && !eventImageRemove.disabled;
    if (!hasExistingImage) {
      eventImageRemove.disabled = true;
      eventImageRemove.checked = false;
    }
    setImageStatus(hasExistingImage ? '기존 이미지가 첨부되어 있습니다.' : '이미지가 첨부되지 않았습니다.');
  }
}

function handleImageRemoveChange() {
  if (eventImageRemove.disabled) {
    return;
  }

  if (eventImageRemove.checked) {
    eventImageInput.value = '';
    setImageStatus('이미지를 삭제하도록 설정했습니다.');
  } else {
    handleImageInputChange();
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

function openModal(isoDate) {
  state.selectedDate = isoDate;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  const dateObj = parseISODate(isoDate);
  const weekdayLabel = WEEKDAYS[(dateObj.getDay() + 6) % 7];
  modalDateLabel.textContent = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${weekdayLabel})`;

  prepareNewEventForm();
  renderEventList();
  eventCategorySelect.focus();
}

function closeModal() {
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  state.selectedDate = null;
  prepareNewEventForm();
}

function renderEventList() {
  const isoDate = state.selectedDate;
  if (!isoDate) return;

  const dateObj = parseISODate(isoDate);
  const lunarInfo = getLunarInfo(dateObj);
  const combined = getCombinedEventsForDate(isoDate, dateObj, lunarInfo);
  const userEvents = state.events[isoDate] || [];

  eventListEl.innerHTML = '';

  if (combined.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = '등록된 일정이 없습니다.';
    empty.classList.add('empty');
    eventListEl.appendChild(empty);
    deleteAllBtn.disabled = true;
    return;
  }

  combined.forEach((event) => {
    const item = template.content.firstElementChild.cloneNode(true);
    const marker = item.querySelector('.event-marker');
    const titleEl = item.querySelector('.event-title');
    const imageEl = item.querySelector('.event-image');
    const notesEl = item.querySelector('.event-notes');
    const categoryLabel = item.querySelector('.event-category-label');
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');

    const color = getCategoryColor(event.category);
    marker.style.backgroundColor = color;
    titleEl.textContent = event.title;

    if (event.imageData) {
      imageEl.src = event.imageData;
      imageEl.alt = `${event.title} 이미지`;
      imageEl.hidden = false;
    } else {
      imageEl.removeAttribute('src');
      imageEl.hidden = true;
    }

    if (event.notes) {
      notesEl.textContent = event.notes;
      notesEl.hidden = false;
    } else {
      notesEl.hidden = true;
      notesEl.textContent = '';
    }

    const baseLabel = CATEGORIES[event.category]?.label || '기타';
    categoryLabel.textContent = event.isRecurring ? `${baseLabel} · 반복` : baseLabel;

    if (event.isRecurring) {
      item.classList.add('recurring');
      editBtn.hidden = true;
      editBtn.disabled = true;
      deleteBtn.hidden = true;
      deleteBtn.disabled = true;
    } else {
      editBtn.addEventListener('click', () => startEditingEvent(event));
      deleteBtn.addEventListener('click', () => deleteEvent(event.id));

      if (state.editingEventId === event.id) {
        item.classList.add('editing');
      }
    }

    eventListEl.appendChild(item);
  });

  deleteAllBtn.disabled = userEvents.length === 0;
}

async function handleEventSubmit(event) {
  event.preventDefault();
  if (!state.selectedDate) return;

  const category = eventCategorySelect.value;
  const title = eventTitleInput.value.trim();
  const notes = eventNotesInput.value.trim();
  const file = eventImageInput.files && eventImageInput.files[0] ? eventImageInput.files[0] : null;
  const removeExistingImage = eventImageRemove.checked && !file;

  if (!category || !title) {
    alert('구분과 제목을 입력해 주세요.');
    return;
  }

  let imageData = null;
  if (file) {
    try {
      imageData = await readFileAsDataURL(file);
    } catch (error) {
      console.warn('이미지를 읽을 수 없습니다.', error);
      alert('이미지 파일을 불러오지 못했습니다. 다른 파일을 선택해 주세요.');
      return;
    }
  }

  const isoDate = state.selectedDate;
  const events = state.events[isoDate] || [];

  if (state.editingEventId) {
    const index = events.findIndex((item) => item.id === state.editingEventId);
    if (index !== -1) {
      const existing = events[index];
      const updated = {
        ...existing,
        category,
        title,
        updatedAt: Date.now()
      };

      if (notes) {
        updated.notes = notes;
      } else {
        delete updated.notes;
      }

      if (imageData !== null) {
        updated.imageData = imageData;
      } else if (removeExistingImage) {
        delete updated.imageData;
      }

      events[index] = updated;
    } else {
      events.push(createEventObject({ category, title, notes, imageData }));
    }
  } else {
    events.push(createEventObject({ category, title, notes, imageData }));
  }

  state.events[isoDate] = events;
  persistEvents();
  renderCalendar();
  prepareNewEventForm();
  renderEventList();
  eventCategorySelect.focus();
}

function deleteEvent(eventId) {
  if (RECURRING_EVENT_IDS.has(eventId)) {
    return;
  }

  const isoDate = state.selectedDate;
  if (!isoDate) return;

  const events = state.events[isoDate] || [];
  const nextEvents = events.filter((event) => event.id !== eventId);
  state.events[isoDate] = nextEvents;

  if (nextEvents.length === 0) {
    delete state.events[isoDate];
  }

  if (state.editingEventId === eventId) {
    prepareNewEventForm();
  }

  persistEvents();
  renderCalendar();
  renderEventList();
}

function handleDeleteAll() {
  if (!state.selectedDate) return;
  if (!state.events[state.selectedDate]) return;

  const confirmDelete = confirm('이 날짜의 모든 일정을 삭제하시겠어요?');
  if (!confirmDelete) return;

  delete state.events[state.selectedDate];
  prepareNewEventForm();
  persistEvents();
  renderCalendar();
  renderEventList();
}

function handleShareLink() {
  const data = encodeShareData(state.events);
  const url = new URL(window.location.href);
  url.searchParams.set('data', data);
  const shareUrl = url.toString();

  if (navigator.share) {
    navigator.share({
      title: '이언이네 일정표',
      text: '이언이네 일정표를 공유합니다.',
      url: shareUrl
    }).catch(() => copyToClipboard(shareUrl));
  } else {
    copyToClipboard(shareUrl);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => alert('공유 링크를 복사했습니다.'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    alert('공유 링크를 복사했습니다.');
  } catch (error) {
    alert('링크 복사에 실패했습니다. 아래 주소를 직접 복사해 주세요.\n' + text);
  } finally {
    document.body.removeChild(textarea);
  }
}

function handleExport() {
  const blob = new Blob([JSON.stringify(state.events, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const timestamp = new Date().toISOString().split('T')[0];
  link.download = `family-calendar-${timestamp}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || typeof imported !== 'object') {
        throw new Error('데이터 형식이 올바르지 않습니다.');
      }
      state.events = imported;
      persistEvents();
      renderCalendar();
      if (state.selectedDate) {
        renderEventList();
      }
      alert('일정 데이터를 불러왔습니다.');
    } catch (error) {
      alert('일정 데이터를 불러올 수 없습니다. 파일을 확인해주세요.');
      console.warn(error);
    } finally {
      importInput.value = '';
    }
  };
  reader.readAsText(file);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(isoString) {
  const [year, month, day] = isoString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function encodeShareString(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeShareString(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}
