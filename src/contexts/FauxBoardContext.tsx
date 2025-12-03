import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react"

interface FauxBoardContextType {
  isFauxBoard: boolean
  setIsFauxBoard: (isFauxBoard: boolean) => void
}

const FauxBoardContext = createContext<FauxBoardContextType | undefined>(
  undefined,
)

export const FauxBoardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isFauxBoard, setIsFauxBoard] = useState<boolean>(false)

  const value = useMemo(
    () => ({
      isFauxBoard,
      setIsFauxBoard,
    }),
    [isFauxBoard],
  )

  return (
    <FauxBoardContext.Provider value={value}>
      {children}
    </FauxBoardContext.Provider>
  )
}

export const useFauxBoard = () => {
  const context = useContext(FauxBoardContext)
  if (!context) {
    throw new Error("useFauxBoard must be used within a FauxBoardProvider")
  }
  return context
}
