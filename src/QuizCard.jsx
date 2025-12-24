import './QuizCard.css'

export default function QuizCard({ quiz }) {
  const options = ['A', 'B', 'C', 'D']

  return (
    <div className="quiz-card-wrapper">
      <div className="quiz-card-background"></div>
      <div className="quiz-card">
        <div className="quiz-question">{quiz.question}</div>
        <div className="quiz-options">
          {quiz.options.map((option, index) => (
            <div key={index} className="quiz-option">
              <div className="option-circle">{options[index]}</div>
              <div className="option-text">{option}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

