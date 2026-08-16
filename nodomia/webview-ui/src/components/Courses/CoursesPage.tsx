import type { CourseListItem, UserProgress } from '../../types/messages'
import CourseCard from './CourseCard'
import { pluralize } from '../../utils/plural'

interface CoursesPageProps {
  courses: CourseListItem[]
  onSelectCourse: (id: string) => void
  progress: UserProgress
}

export default function CoursesPage({ courses, onSelectCourse, progress }: CoursesPageProps) {
  const count = courses.length

  return (
    <div className="courses-page">
      <h1 className="courses-title">
        Обзор курсов{' '}
        <span className="courses-count">{count} {pluralize(count, 'курс', 'курса', 'курсов')}</span>
      </h1>

      <div className="courses-grid">
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            onEnter={() => onSelectCourse(course.id)}
            progress={progress}
          />
        ))}
      </div>
    </div>
  )
}
