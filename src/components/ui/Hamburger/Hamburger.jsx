import { useState } from 'react'
import '../../../styles/global.css'
import styles from './Hamburger.module.css';
import Droplist from '../Droplist/Droplist.jsx'

function Hamburger(props) {
  const [isOpen, setIsOpen] = useState(false) // задаем значение чтобы изначально список была закрыта
  const toggleDroplist = () => {
    setIsOpen(!isOpen) // запускаем setIsOpen и меняем с помощью ! меняем булевое значение
  }
  const closeDroplist = () => {
    setIsOpen(false)
  }
  return (
    <div className={styles.menuWrap}>
      <button type="button" className={styles.button} onClick={toggleDroplist}>
        <span className={styles.buttonIcon}>☰</span>
        <span>Разделы</span>
      </button>
      {isOpen && ( // ставим определенную компоненту под саму функцию, чтобы лист был спрятан, тк isOpen = false
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Закрыть меню"
            onClick={closeDroplist}
          />
          <div className={styles.dropdown}>
            <Droplist onNavigate={closeDroplist} />
          </div>
        </>
      )}
    </div>
  )
}

export default Hamburger