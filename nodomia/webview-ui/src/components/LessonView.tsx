import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Document, Resource } from '../types/messages';
import '../styles/components.css';

interface LessonViewProps {
  document: Document;
  resources: Resource[];
}

export default function LessonView({ document, resources }: LessonViewProps) {
  return (
    <div className="lesson-container">
      <h2 className="lesson-title">{document.title}</h2>
      {resources.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {resources.map((r) => (
            <a
              key={r.url}
              className="lesson-resources__link"
              href={r.url}
              style={{ marginRight: 8 }}
            >
              {r.title}
            </a>
          ))}
        </div>
      )}
      <div className="lesson-content">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {document.content}
        </Markdown>
      </div>
    </div>
  );
}
