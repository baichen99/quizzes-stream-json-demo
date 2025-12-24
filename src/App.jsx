import { useState, useEffect, useRef } from 'react'
import { JSONParser } from '@streamparser/json'
import Stack from './Stack'
import QuizCard from './QuizCard'
import { mockQuizzes } from './mockData'
import './App.css'

function App() {
  const [loadedQuizzes, setLoadedQuizzes] = useState([])
  const [rawData, setRawData] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const stackRef = useRef(null)

  useEffect(() => {
    let isCancelled = false
    const quizzesData = { quizzes: mockQuizzes }
    const jsonStr = JSON.stringify(quizzesData)
    let currentRawData = ''
    
    const parser = new JSONParser({
      paths: ['$.quizzes.*']
    })

    parser.onValue = ({ value }) => {
      if (!isCancelled) {
        setLoadedQuizzes(prev => {
          const exists = prev.some(q => q.id === value.id)
          if (exists) return prev
          return [...prev, value]
        })
      }
    }

    let timeoutId = null
    let index = 0
    const loadNextChar = () => {
      if (isCancelled) return
      
      if (index < jsonStr.length) {
        const char = jsonStr[index]
        currentRawData += char
        if (!isCancelled) {
          setRawData(currentRawData)
          parser.write(char)
        }
        index++
        timeoutId = setTimeout(loadNextChar, 10)
      } else {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    setLoadedQuizzes([])
    setRawData('')
    setIsLoading(true)
    loadNextChar()

    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  const cards = loadedQuizzes.map(quiz => (
    <QuizCard key={quiz.id} quiz={quiz} />
  ))

  const handleNext = () => {
    if (stackRef.current) {
      stackRef.current.next()
    }
  }

  const handlePrev = () => {
    if (stackRef.current) {
      stackRef.current.prev()
    }
  }

  return (
    <div className="app">
      <div className="content">
        <div className="stack-wrapper">
          <Stack
            ref={stackRef}
            cards={cards}
            sendToBackOnClick={false}
            sensitivity={150}
            randomRotation={true}
            animationConfig={{ stiffness: 260, damping: 40 }}
          />
        </div>
        <div className="controls">
          <button className="control-btn" onClick={handlePrev} disabled={loadedQuizzes.length === 0}>
            Previous
          </button>
          <button className="control-btn" onClick={handleNext} disabled={loadedQuizzes.length === 0}>
            Next
          </button>
        </div>
        <div className="status-panel">
          <div className="status-info">
            <div className="status-item">
              <span className="status-label">Loaded:</span>
              <span className="status-value">{loadedQuizzes.length} / {mockQuizzes.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className="status-value">{isLoading ? 'Loading...' : 'Complete'}</span>
            </div>
          </div>
          <div className="raw-data">
            <div className="raw-data-label">Raw Data:</div>
            <pre className="raw-data-content">{rawData}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

