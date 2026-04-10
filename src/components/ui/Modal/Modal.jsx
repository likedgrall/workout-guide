import { useEffect, useMemo, useState } from "react";
import { exercisesDatabase } from "../../../storage/exercises.js";
import styles from "./Modal.module.css";

const normalizeExerciseName = (value = "") =>
    value
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

function Modal({ data }) {
    const [category, setCategory] = useState("all");

    useEffect(() => {
        setCategory("all");
    }, [data?.id]);

    const exerciseVideoMap = useMemo(() => {
        const entries = exercisesDatabase
            .filter((exercise) => exercise.title)
            .map((exercise) => [
                normalizeExerciseName(exercise.title),
                exercise.videoUrl || "",
            ]);

        return new Map(entries);
    }, []);

    const exercises = useMemo(() => {
        if (!data) {
            return [];
        }

        const categories = ["freeWeight", "gym", "bodyWeight"];

        return categories.flatMap((cat) =>
            (data[cat] || []).map((exercise) => ({
                ...exercise,
                category: cat,
                linkToVideo:
                    exercise.linkToVideo ||
                    exerciseVideoMap.get(normalizeExerciseName(exercise.name)) ||
                    "",
            }))
        );
    }, [data, exerciseVideoMap]);

    const filteredExercises = useMemo(() => {
        if (category === "all") return exercises;
        return exercises.filter((exercise) => exercise.category === category);
    }, [category, exercises]);

    const buttons = useMemo(
        () => [
            { key: "all", label: "Все" },
            { key: "freeWeight", label: "Свободный вес" },
            { key: "gym", label: "В зале" },
            { key: "bodyWeight", label: "Собственный вес" },
        ],
        []
    );

    if (!data) {
        return null;
    }

    return (
        <div className={styles.modal__elements}>
            <h1>{data.name}</h1>

            <div className={styles.categories}>
                {buttons.map((btn) => (
                    <button
                        key={btn.key}
                        onClick={() => setCategory(btn.key)}
                        className={`${styles.categoryBtn} ${category === btn.key ? styles.categoryBtnActive : ""}`}
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
