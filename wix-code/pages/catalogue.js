import wixLocationFrontend from 'wix-location-frontend';
import { getCatalogue } from 'backend/catalogue.web';

let allCourses = [];
let filteredCourses = [];

$w.onReady(async function () {
  wireResults();
  wireFilters();
  setLoading(true);

  try {
    const result = await getCatalogue();
    allCourses = result.courses.map((course) => ({ ...course, _id: course.id }));
    populateFilterOptions();
    applyFilters();
    $w('#errorText').collapse();
  } catch (error) {
    console.error('Could not load course catalogue', error);
    $w('#errorText').text = 'The course catalogue could not be loaded. Please try again shortly.';
    $w('#errorText').expand();
  } finally {
    setLoading(false);
  }
});

function wireResults() {
  $w('#courseRepeater').onItemReady(($item, itemData) => {
    $item('#cardTitle').text = itemData.title;
    $item('#cardSummary').text = itemData.summary;
    $item('#cardPillar').text = itemData.pillar;
    $item('#cardTrack').text = itemData.track;
    $item('#cardDuration').text = formatDuration(itemData);
    $item('#cardFormat').text = (itemData.deliveryFormat || []).join(' · ');
    $item('#cardButton').onClick(() => openCourse(itemData.slug));
  });

  $w('#courseTable').onRowSelect((event) => {
    if (event.rowData && event.rowData.slug) {
      openCourse(event.rowData.slug);
    }
  });

  $w('#cardsButton').onClick(() => setView('cards'));
  $w('#tableButton').onClick(() => setView('table'));
}

function wireFilters() {
  $w('#searchInput').onInput(debounce(applyFilters, 200));
  [
    '#audienceDropdown',
    '#pillarDropdown',
    '#trackDropdown',
    '#clientTypeDropdown',
    '#businessFunctionDropdown',
    '#deliveryFormatDropdown',
    '#durationDropdown'
  ].forEach((selector) => $w(selector).onChange(applyFilters));

  $w('#clearFiltersButton').onClick(() => {
    $w('#searchInput').value = '';
    [
      '#audienceDropdown',
      '#pillarDropdown',
      '#trackDropdown',
      '#clientTypeDropdown',
      '#businessFunctionDropdown',
      '#deliveryFormatDropdown',
      '#durationDropdown'
    ].forEach((selector) => { $w(selector).selectedIndex = 0; });
    applyFilters();
  });
}

function populateFilterOptions() {
  setDropdown('#audienceDropdown', 'All audiences', valuesFromArray('audience'));
  setDropdown('#pillarDropdown', 'All pillars', valuesFromScalar('pillar'));
  setDropdown('#trackDropdown', 'All tracks', valuesFromScalar('track'));
  setDropdown('#clientTypeDropdown', 'All client types', valuesFromArray('clientType'));
  setDropdown('#businessFunctionDropdown', 'All business functions', valuesFromArray('businessFunction'));
  setDropdown('#deliveryFormatDropdown', 'All delivery formats', valuesFromArray('deliveryFormat'));
  setDropdown('#durationDropdown', 'Any duration', ['Up to 4 hours', '1 day', '2+ days']);
}

function setDropdown(selector, allLabel, values) {
  $w(selector).options = [
    { label: allLabel, value: '' },
    ...values.map((value) => ({ label: value, value }))
  ];
  $w(selector).selectedIndex = 0;
}

function valuesFromArray(field) {
  return [...new Set(allCourses.flatMap((course) => course[field] || []))].sort();
}

function valuesFromScalar(field) {
  return [...new Set(allCourses.map((course) => course[field]).filter(Boolean))].sort();
}

function applyFilters() {
  const search = ($w('#searchInput').value || '').trim().toLowerCase();
  const audience = $w('#audienceDropdown').value;
  const pillar = $w('#pillarDropdown').value;
  const track = $w('#trackDropdown').value;
  const clientType = $w('#clientTypeDropdown').value;
  const businessFunction = $w('#businessFunctionDropdown').value;
  const deliveryFormat = $w('#deliveryFormatDropdown').value;
  const duration = $w('#durationDropdown').value;

  filteredCourses = allCourses.filter((course) => {
    const searchable = [
      course.title,
      course.summary,
      course.pillar,
      course.track,
      ...(course.businessFunction || [])
    ].join(' ').toLowerCase();

    return (!search || searchable.includes(search))
      && matchesArray(course.audience, audience)
      && (!pillar || course.pillar === pillar)
      && (!track || course.track === track)
      && matchesArray(course.clientType, clientType)
      && matchesArray(course.businessFunction, businessFunction)
      && matchesArray(course.deliveryFormat, deliveryFormat)
      && matchesDuration(course, duration);
  });

  renderResults();
}

function matchesArray(values = [], selected) {
  return !selected || values.includes(selected);
}

function matchesDuration(course, selected) {
  if (!selected) return true;
  const hours = durationInHours(course);
  if (selected === 'Up to 4 hours') return hours <= 4;
  if (selected === '1 day') return hours > 4 && hours <= 8;
  return hours > 8;
}

function durationInHours(course) {
  const multipliers = { hours: 1, days: 8, weeks: 40 };
  return Number(course.durationValue) * (multipliers[course.durationUnit] || 1);
}

function renderResults() {
  $w('#resultCount').text = `${filteredCourses.length} ${filteredCourses.length === 1 ? 'course' : 'courses'}`;
  $w('#courseRepeater').data = filteredCourses;
  $w('#courseTable').rows = filteredCourses.map((course) => ({
    _id: course.id,
    title: course.title,
    pillar: course.pillar,
    track: course.track,
    deliveryFormat: (course.deliveryFormat || []).join(', '),
    duration: formatDuration(course),
    slug: course.slug
  }));

  if (filteredCourses.length) {
    $w('#noResultsText').collapse();
  } else {
    $w('#noResultsText').expand();
  }
}

function setView(view) {
  if (view === 'table') {
    $w('#courseRepeater').collapse();
    $w('#courseTable').expand();
  } else {
    $w('#courseTable').collapse();
    $w('#courseRepeater').expand();
  }
}

function openCourse(slug) {
  wixLocationFrontend.to(`/course?slug=${encodeURIComponent(slug)}`);
}

function formatDuration(course) {
  const value = Number(course.durationValue);
  const unit = value === 1 ? course.durationUnit.replace(/s$/, '') : course.durationUnit;
  return `${value} ${unit}`;
}

function setLoading(isLoading) {
  if (isLoading) {
    $w('#loadingText').expand();
    $w('#resultsBox').collapse();
  } else {
    $w('#loadingText').collapse();
    $w('#resultsBox').expand();
  }
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}
