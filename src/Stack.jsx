import { motion, useMotionValue, useTransform } from 'motion/react'
import { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import './Stack.css'

function CardRotate({ children, onSendToBack, sensitivity, disableDrag = false }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [60, -60])
  const rotateY = useTransform(x, [-100, 100], [-60, 60])

  function handleDragEnd(_, info) {
    if (Math.abs(info.offset.x) > sensitivity || Math.abs(info.offset.y) > sensitivity) {
      onSendToBack()
    } else {
      x.set(0)
      y.set(0)
    }
  }

  if (disableDrag) {
    return (
      <motion.div className="card-rotate-disabled" style={{ x: 0, y: 0 }}>
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="card-rotate"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  )
}

const Stack = forwardRef(function Stack({
  randomRotation = false,
  sensitivity = 200,
  cards = [],
  animationConfig = { stiffness: 260, damping: 20 },
  sendToBackOnClick = false,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
}, ref) {
  const [isPaused, setIsPaused] = useState(false)
  const rotationCacheRef = useRef(new Map())

  const stableCards = useMemo(() => {
    return cards.map((content, index) => {
      const key = content.key || index
      if (!rotationCacheRef.current.has(key)) {
        rotationCacheRef.current.set(key, randomRotation ? Math.random() * 10 - 5 : 0)
      }
      return {
        id: key,
        content,
        randomRotate: rotationCacheRef.current.get(key)
      }
    })
  }, [cards, randomRotation])

  const [stack, setStack] = useState(() => {
    return stableCards
  })

  useEffect(() => {
    if (stableCards.length > 0) {
      setStack(prev => {
        const prevIds = new Set(prev.map(c => c.id))
        const newIds = new Set(stableCards.map(c => c.id))
        const idsEqual = prevIds.size === newIds.size && 
          [...prevIds].every(id => newIds.has(id))
        
        if (idsEqual && prev.length === stableCards.length) {
          return prev
        }
        
        return stableCards
      })
    }
  }, [stableCards])

  const sendToBack = id => {
    setStack(prev => {
      const newStack = [...prev]
      const index = newStack.findIndex(card => card.id === id)
      if (index === -1) return prev
      const [card] = newStack.splice(index, 1)
      newStack.unshift(card)
      return newStack
    })
  }

  const sendToFront = id => {
    setStack(prev => {
      const newStack = [...prev]
      const index = newStack.findIndex(card => card.id === id)
      if (index === -1) return prev
      const [card] = newStack.splice(index, 1)
      newStack.push(card)
      return newStack
    })
  }

  const handleNext = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) return prev
      const newStack = [...prev]
      const topCard = newStack.pop()
      newStack.unshift(topCard)
      return newStack
    })
  }, [])

  const handlePrev = useCallback(() => {
    setStack(prev => {
      if (prev.length === 0) return prev
      const newStack = [...prev]
      const bottomCard = newStack.shift()
      newStack.push(bottomCard)
      return newStack
    })
  }, [])

  useImperativeHandle(ref, () => ({
    next: handleNext,
    prev: handlePrev
  }), [handleNext, handlePrev])

  useEffect(() => {
    if (autoplay && stack.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        const topCardId = stack[stack.length - 1].id
        sendToBack(topCardId)
      }, autoplayDelay)

      return () => clearInterval(interval)
    }
  }, [autoplay, autoplayDelay, stack, isPaused])

  return (
    <div
      className="stack-container"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {stack.map((card, index) => {
        return (
          <CardRotate
            key={card.id}
            onSendToBack={() => sendToBack(card.id)}
            sensitivity={sensitivity}
          >
            <motion.div
              className="card"
              onClick={() => sendToBackOnClick && sendToBack(card.id)}
              animate={{
                rotateZ: (stack.length - index - 1) * 4 + (card.randomRotate || 0),
                scale: 1 + index * 0.06 - stack.length * 0.06,
                transformOrigin: '90% 90%'
              }}
              initial={false}
              transition={{
                type: 'spring',
                stiffness: animationConfig.stiffness,
                damping: animationConfig.damping,
                mass: 0.8
              }}
            >
              {card.content}
            </motion.div>
          </CardRotate>
        )
      })}
    </div>
  )
})

export default Stack

