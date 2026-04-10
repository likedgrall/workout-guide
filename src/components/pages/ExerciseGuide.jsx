import { useMemo, useState, useCallback } from "react";
import { polygonsDatabaseFront, polygonsDatabaseBack } from "../../storage/muscles";
import styles from "./css/page.module.css";
import "../../styles/global.css";
import Modal from "../ui/Modal/Modal.jsx";

function ExerciseGuide() {
  const [side, setSide] = useState("front"); // 'front' | 'back'
  const sideLabel = side === "front" ? "Передняя часть" : "Задняя часть";


  // Функция для определения цвета полигона по его имени
  const getPolygonColor = useCallback((polygonName) => {
    if (polygonName.includes("head") || polygonName.includes("top_peak")) {
      return "#FFD700";
    } else if (
      polygonName.includes("wing") ||
      polygonName.includes("outer") ||
      polygonName.includes("extra")
    ) {
      return "#C0C0C0";
    } else if (polygonName.includes("body")) {
      return "#FF6347";
    } else if (
      polygonName.includes("tail") ||
      polygonName.includes("lower") ||
      polygonName.includes("bottom")
    ) {
      return "#4682B4";
    } else if (polygonName.includes("leg") || polygonName.includes("base")) {
      return "#8B4513";
    } else if (polygonName.includes("side")) {
      return "#9370DB";
    } else {
      return "#808080";
    }
  }, []);

  const getPolygonOpacity = useCallback(() => 0.9, []);

  const polygonsArrayFront = useMemo(() => Object.values(polygonsDatabaseFront), []);
  const polygonsArrayBack = useMemo(() => Object.values(polygonsDatabaseBack), []);

  const activePolygons = side === "front" ? polygonsArrayFront : polygonsArrayBack;

  // ✅ Вынесли рендер полигонов в отдельную функцию
  const renderPolygons = useCallback(
    (polygonsArray) =>
      polygonsArray.map((polygon) => (
        <polygon
          key={`${side}-${polygon.id}`} // важно: чтобы при смене side React точно пересоздал элементы
          points={polygon.points}
          data-id={polygon.id}
          data-name={polygon.name}
          className={`muscle-part muscle-${polygon.id} ${polygon.name}`}
          fill="#999999cb"
          opacity={getPolygonOpacity(polygon.name)}
          stroke="transparent"
          strokeWidth="0.2"
          style={{
            transition: "all 0.3s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.target.style.fill = "#838383";
            e.target.style.opacity = "1";
            e.target.style.strokeWidth = "0.5";
          }}
          onMouseLeave={(e) => {
            e.target.style.fill = "#999999cb";
            e.target.style.opacity = getPolygonOpacity(polygon.name);
            e.target.style.strokeWidth = "0.2";
          }}
          onClick={() => {
            console.log(`Выбрана мышца: ${polygon.name} (ID: ${polygon.id})`);
            openModal(polygon);
          }}
        />
      )),
    [getPolygonOpacity, side]
  );

  const [isOpen, setIsOpen] = useState(false) // задаем значение чтобы изначально список была закрыта
  const [selectedMuscle, setSelectedMuscle] = useState(null);

  const openModal = (data) => {
    setSelectedMuscle(data);
    setIsOpen(true) // запускаем setIsOpen и меняем с помощью ! меняем булевое значение
  }
  const closeModal = () => {
    setIsOpen(false)
  }

  return (
    <div className={styles.page_setting}>
      <h1 className={styles.title}>Руководство по упражнениям</h1>
      <p className={styles.description}>Нажмите на мышцу, чтобы посмотреть упражнения</p>

      <div className={styles.toggle_group}>
        <button
          type="button"
          className={`${styles.toggle_button} ${styles.active}`}
          onClick={() =>
            setSide((currentSide) => (currentSide === "front" ? "back" : "front"))
          }
          aria-label={`Показать ${side === "front" ? "заднюю" : "переднюю"} часть`}
        >
          {sideLabel}
        </button>
      </div>

      <div className={styles.svg_container}>
        <svg
          className="muscle-svg"
          width="100%"
          height="100%"
          viewBox="0 0 100 200"
          style={{ backgroundColor: "transparent", borderRadius: "8px" }}
        >
          {renderPolygons(activePolygons)}
        </svg>
      </div>


      {isOpen && ( // ставим определенную компоненту под саму функцию, чтобы лист был спрятан, тк isOpen = false
        <div className={styles.modal_container} >
          <button className={styles.close_button} onClick={closeModal}>╳</button>
          <Modal
            data={selectedMuscle}
          />
        </div>
      )}
    </div>
  );
}

export default ExerciseGuide;
