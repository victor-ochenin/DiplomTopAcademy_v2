import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Course,
  CourseListItem,
  ExtensionMessage,
  UserProgress,
} from './types/messages';
import { useVsCodeApi } from './hooks/useVsCodeApi';
import CoursesPage from './components/Courses/CoursesPage';
import CourseTab from './components/Courses/CourseTab';
import RagAssistant from './components/RagAssistant/RagAssistant';
import './styles/components.css';

export default function App() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [progress, setProgress] = useState<UserProgress>({
    completedTasks: {},
  });
  const [hasHydratedProgress, setHasHydratedProgress] = useState(false);
  const courseCache = useRef(new Map<string, Course>());
  const pendingCourseIdRef = useRef<string | null>(null);

  const handleMessage = useCallback((message: ExtensionMessage) => {
    if (message.type === 'courses') {
      setCourses(message.payload);
      setIsLoading(false);
    } else if (message.type === 'courseDetails') {
      if (
        message.payload &&
        message.payload.id === pendingCourseIdRef.current
      ) {
        courseCache.current.set(message.payload.id, message.payload);
        setSelectedCourse(message.payload);
      }
      setIsLoadingDetails(false);
    } else if (message.type === 'ragError') {
      setIsLoading(false);
    } else if (message.type === 'progress') {
      setProgress((prev) => ({
        completedTasks: {
          ...message.payload.completedTasks,
          ...prev.completedTasks,
        },
      }));
      setHasHydratedProgress(true);
    }
  }, []);

  const { postMessage } = useVsCodeApi(handleMessage);

  useEffect(() => {
    postMessage({ type: 'getCourses' });
    postMessage({ type: 'loadProgress' });
  }, [postMessage]);

  // сохраняем прогресс в extension host
  useEffect(() => {
    if (!hasHydratedProgress) {
      return;
    }
    postMessage({ type: 'saveProgress', payload: progress });
  }, [progress, hasHydratedProgress, postMessage]);

  const completeItem = useCallback((lessonId: string, itemId: string) => {
    setProgress((prev) => ({
      completedTasks: {
        ...prev.completedTasks,
        [`${lessonId}:${itemId}`]: true,
      },
    }));
  }, []);

  const handleSelectCourse = useCallback(
    (id: string) => {
      pendingCourseIdRef.current = id;
      const cached = courseCache.current.get(id);
      if (cached) {
        setSelectedCourse(cached);
      } else {
        setIsLoadingDetails(true);
        postMessage({ type: 'getCourseDetails', payload: id });
      }
    },
    [postMessage],
  );

  const handleBackToList = useCallback(() => {
    setSelectedCourse(null);
  }, []);

  if (isLoading || isLoadingDetails) {
    return (
      <>
        <div className="loading">
          <div className="spinner" />
          <p>{isLoadingDetails ? 'Загрузка курса...' : 'Загрузка курсов...'}</p>
        </div>
        <RagAssistant />
      </>
    );
  }

  return (
    <>
      {selectedCourse ? (
        <CourseTab
          course={selectedCourse}
          onBack={handleBackToList}
          progress={progress}
          onCompleteItem={completeItem}
        />
      ) : (
        <CoursesPage
          courses={courses}
          onSelectCourse={handleSelectCourse}
          progress={progress}
        />
      )}

      <RagAssistant />
    </>
  );
}
