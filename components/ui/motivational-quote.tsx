"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Array of motivational quotes
const quotes = [
  "The only bad workout is the one that didn't happen.",
  "Your body can stand almost anything. It's your mind that you have to convince.",
  "The difference between try and triumph is just a little umph!",
  "The hard days are the best because that's when champions are made.",
  "Strength does not come from physical capacity. It comes from an indomitable will.",
  "The clock is ticking. Are you becoming the person you want to be?",
  "You don't have to be extreme, just consistent.",
  "The only place where success comes before work is in the dictionary.",
  "Don't count the days, make the days count.",
  "It's going to be a journey. It's not a sprint to get in shape.",
  "Success is usually the culmination of controlling failure.",
  "The body achieves what the mind believes.",
  "Rome wasn't built in a day, but they were laying bricks every hour.",
  "Discipline is choosing between what you want now and what you want most.",
  "The pain you feel today will be the strength you feel tomorrow.",
]

export default function MotivationalQuote() {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Set up the interval to change quotes every 60 seconds
    const quoteInterval = setInterval(() => {
      // Start fade out
      setIsVisible(false)

      // After fade out completes, change the quote and fade in
      setTimeout(() => {
        setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length)
        setIsVisible(true)
      }, 500) // This should match the fade-out duration
    }, 60000) // 60 seconds

    // Clean up the interval on component unmount
    return () => clearInterval(quoteInterval)
  }, [])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentQuoteIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isVisible ? 1 : 0, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="text-left text-xl text-muted-foreground italic"
      >
        "{quotes[currentQuoteIndex]}"
      </motion.div>
    </AnimatePresence>
  )
}
