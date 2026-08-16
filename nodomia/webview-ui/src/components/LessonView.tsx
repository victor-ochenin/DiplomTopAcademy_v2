import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Document, Resource } from '../types/messages'
import '../styles/components.css'

interface LessonViewProps {
  document: Document
  resources?: Resource[]
}

export default function LessonView({ document, resources }: LessonViewProps) {
  return (
    <div className="lesson-container">
      <h2 className="lesson-title">{document.title}</h2>
      {resources && resources.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <a className="lesson-resources__link" href={resources[0].url}>Источник</a>
        </div>
      )}
      <div className="lesson-content">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{document.content}</Markdown>
      </div>
    </div>
  )
}
