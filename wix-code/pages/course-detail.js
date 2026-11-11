import wixLocationFrontend from 'wix-location-frontend';
import { getCourseBySlug } from 'backend/catalogue.web';

$w.onReady(async function () {
  const slug = wixLocationFrontend.query.slug;

  if (!slug) {
    showNotFound();
    return;
  }

  try {
    const course = await getCourseBySlug(slug);
    if (!course) {
      showNotFound();
      return;
    }

    $w('#courseTitle').text = course.title;
    $w('#courseSummary').text = course.summary;
    $w('#coursePillar').text = course.pillar;
    $w('#courseTrack').text = course.track;
    $w('#courseAudience').text = (course.audience || []).join(' · ');
    $w('#courseClientType').text = (course.clientType || []).join(' · ');
    $w('#courseFunction').text = (course.businessFunction || []).join(' · ');
    $w('#courseFormat').text = (course.deliveryFormat || []).join(' · ');
    $w('#courseDuration').text = formatDuration(course);
    $w('#courseInstructor').text = course.instructor || 'Lunis Training';

    setSection('#aimContent', course, 'Aim and Purpose');
    setSection('#audienceContent', course, 'Intended Audience');
    setSection('#objectivesContent', course, 'Learning Objectives');
    setSection('#syllabusContent', course, 'Syllabus');
    setSection('#structureContent', course, 'Structure and Format');
    setSection('#priorKnowledgeContent', course, 'Useful Prior Knowledge and Experience');

    $w('#loadingText').collapse();
    $w('#courseContent').expand();
  } catch (error) {
    console.error('Could not load course', error);
    $w('#errorText').text = 'This course could not be loaded. Please try again shortly.';
    $w('#errorText').expand();
    $w('#loadingText').collapse();
  }
});

function setSection(selector, course, heading) {
  $w(selector).html = course.sectionHtml?.[heading] || '<p>Details coming soon.</p>';
}

function showNotFound() {
  $w('#loadingText').collapse();
  $w('#courseContent').collapse();
  $w('#errorText').text = 'We could not find that course.';
  $w('#errorText').expand();
}

function formatDuration(course) {
  const value = Number(course.durationValue);
  const unit = value === 1 ? course.durationUnit.replace(/s$/, '') : course.durationUnit;
  return `${value} ${unit}`;
}
