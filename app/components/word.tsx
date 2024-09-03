'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { DndContext, DragCancelEvent, DragEndEvent, DragMoveEvent, DragStartEvent, useSensors } from '@dnd-kit/core'
import {
  restrictToHorizontalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers'
import { MouseSensor, TouchSensor, KeyboardSensor, useSensor } from '@dnd-kit/core'
import { Draggable } from './draggable'
import { SwipeConfig } from '../config/swipe-config'
import styles from './word.module.scss'
import { useAppStore } from '../store/store'
import { useShallow } from 'zustand/react/shallow'
import useStore from '../store/use-store'

export interface Word {
  word: string,
  difficulty: number,
  frequency: number,
  definition: string,
  example?: string,
  language: string,
}
interface Props {
  words: Word[],
  name: string | undefined,
}

interface KeyboardEvent {
  key: string,
}

export default function Word({ words, name }: Props) {
  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
    },
  })
  const touchSensor = useSensor(TouchSensor, {
    // Press delay of 250ms, with tolerance of 10px of movement
    activationConstraint: {
      delay: 250,
      tolerance: 10,
    },
  })
  const keyboardSensor = useSensor(KeyboardSensor)
  const sensors = useSensors(
    mouseSensor,
    touchSensor,
    keyboardSensor,
  );
  
  const { processedWords, getNextIndex } = useStore({ words, name: name || '' })
  const { showDetails, currentIndex, init, updateLearnedWords, learnedWords } = useAppStore(useShallow((state) => ({
    showDetails: state.showDetails,
    currentIndex: state.currentIndex,
    init: state.init,
    updateLearnedWords: state.updateLearnedWords,
    learnedWords: state.learnedWords,
  })))

  const [isMoving, setIsMoving] = useState<string | null>(null)
  const [localShowDetails, setLocalShowDetails] = useState<boolean>(false)
  const [status, setStatus] = useState<'pass' | 'fail' | null>(null)

  const nextWord = useCallback(() => {
    getNextIndex()
    setLocalShowDetails(false)
    setTimeout(() => {
      setStatus(null)
    }, 400)
  }, [getNextIndex])

  const pass = useCallback(() => {
    setStatus('pass')
    updateLearnedWords(processedWords[currentIndex].word, name)
    nextWord()
  }, [updateLearnedWords, processedWords, currentIndex, nextWord, name])

  const fail = useCallback(() => {
    setStatus('fail')
    nextWord()
  }, [nextWord])

  const triggerUpdate = useCallback((direction: string) => {
    switch(direction) {
    case 'up': setLocalShowDetails(true); break;
    case 'down': setLocalShowDetails(false); break;
    case 'right': pass(); break;
    case 'left': nextWord(); break;
    default: break;
    }
  }, [nextWord, pass])

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    switch(e.key) {
    case 'ArrowLeft': triggerUpdate('left'); break;
    case 'ArrowRight': triggerUpdate('right'); break;
    case 'ArrowUp': triggerUpdate('up'); break;
    case 'ArrowDown': triggerUpdate('down'); break;
    default: break;
    }
  }, [triggerUpdate])

  const handleSwipe = useCallback((data: any) => {
    switch(data.dir) {
    case 'Right': triggerUpdate('right'); break;
    case 'Left': triggerUpdate('left'); break;
    case 'Up': triggerUpdate('up'); break;
    case 'Down': triggerUpdate('down'); break;
    default: break;
    }
  }, [triggerUpdate])

  const onTap = () => {
    triggerUpdate('up')
  }

  const handlers = useSwipeable({
    onSwiped: (eventData) => {handleSwipe(eventData)},
    ...SwipeConfig,
    onTap: () => {onTap();}
  });

  useEffect(() => {
    if(!init) {
      return
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown, init])

  useEffect(() => {
    if(init && currentIndex === -1) {
      nextWord()
    }
  }, [currentIndex, nextWord, learnedWords, init])

  const currentWord = processedWords[currentIndex]

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('drag end', event)
    if(event.delta.x > 100) {
      pass()
    } else if(event.delta.x < -100) {
      fail()
    }
    setIsMoving(null)
  }

  const handleDragMove = (event: DragMoveEvent) => {
    console.log('drag move', event)
    if(event.delta.x > 50 && isMoving !== 'right') {
      setIsMoving('right')
    } else if(event.delta.x < -50 && isMoving !== 'left') {
      setIsMoving('left')
    }
  }

  const handleDragCancel = (event: DragCancelEvent) => {
    console.log('drag cancel', event)
    setIsMoving(null)
  }

  if(!init) {
    return <div>Loading...</div>
  }

  console.log('status', status)

  return (
    <DndContext
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToHorizontalAxis, restrictToWindowEdges]}
      sensors={sensors}
    >  
      <Draggable status={status}>
        <div className={`${styles.wordContainer}`}>
          {
            isMoving === 'right' &&
            <div className={styles.right}>
              I know this word
            </div>
          }
          {
            isMoving === 'left' &&
            <div className={styles.left}>
              I don&apos;t know this word
            </div>
          }
          <div className={styles.word}>
            {currentWord?.word}
            {
              (showDetails || localShowDetails) &&
                <div className="details">
                  <div className="definition">{currentWord?.definition}</div>
                  <div className="example">{currentWord?.example}</div>
                </div>
            }
          </div>
        </div>
      </Draggable>
    </DndContext>
  )
}