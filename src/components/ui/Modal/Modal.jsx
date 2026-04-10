import styles from "./Modal.module.css";
import { useMemo, useState, useEffect } from "react";

function Modal({ data }) {
    const [category, setCategory] = useState("all");

    // если открыли другую мышцу — сбрасываем фильтр на "Все"
    useEffect(() => {
        setCategory("all");
    }, [data?.id]);

    if (!data) return null;

    // единый массив упражнений + добавляем category
    const exercises = useMemo(() => {
        const categories = ["freeWeight", "gym", "bodyWeight"];

        return categories.flatMap((cat) =>
            (data?.[cat] || []).map((exercise) => ({
                ...exercise,
                category: cat,
            }))
        );
    }, [data]);

    // фильтрация
    const filteredExercises = useMemo(() => {
        if (category === "all") return exercises;
        return exercises.filter((ex) => ex.category === category);
    }, [category, exercises]);

    // кнопки (для удобства и без копипасты)
    const buttons = useMemo(
        () => [
            { key: "all", label: "Все" },
            { key: "freeWeight", label: "Свободный вес" },
            { key: "gym", label: "В зале" },
            { key: "bodyWeight", label: "Собственный вес" },
        ],
        []
    );

    

    return (
        <div className={styles.modal__elements}>
            <h1>{data.name}</h1>

            <div className={styles.categories}>
                {buttons.map((btn) => (
                    <button
                        key={btn.key}
                        onClick={() => setCategory(btn.key)}
                        className={`${styles.categoryBtn} ${category === btn.key ? styles.categoryBtnActive : ""
                            }`}
                        type="button"
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            <div className={styles.list_workouts}>
                {filteredExercises.length === 0 ? (
                    <p className={styles.empty}>Упражнений нет</p>
                ) : (
                    filteredExercises.map((exercise, index) => (
                        <div key={`${exercise.category}-${exercise.name}-${index}`} className={styles.workoutItem}>
                            <span className={styles.workoutName}>{exercise.name}</span>

                            {exercise.linkToVideo ? (
                                <a
                                    className={styles.workoutLink}
                                    href={exercise.linkToVideo}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Видео
                                </a>
                            ) : (
                                <span className={styles.noVideo}>Нет видео</span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Modal;