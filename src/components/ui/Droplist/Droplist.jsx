import '../../../styles/global.css'
import styles from './Droplist.module.css';
import { Link } from 'react-router-dom';

function Droplist({ onNavigate }) {
  return (
      <ul className={styles.list}>
        <li className={styles.item}>
            <Link className={styles.link} to="/exercises" onClick={onNavigate}>Руководство по упражнениям</Link>
        </li>
        <li className={styles.item}>
            <Link className={styles.link} to="/custom-workout" onClick={onNavigate}>Придумать свой план тренировок</Link>
        </li>
      </ul>
  )
}

export default Droplist