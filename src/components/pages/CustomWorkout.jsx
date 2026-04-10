// добавить в базу данных разминку и растяжку и сделать систему отслеживания выполнения упражнений
import { useEffect, useState } from "react";
import styles from "./css/page.module.css";
import { exercisesDatabase } from "../../storage/exercises.js";

const API_URL = import.meta.env.VITE_AI_API_URL || "/api/ai";

const AI_SYSTEM_PROMPT = `
Ты профессиональный фитнес-тренер.
Твоя задача — составить тренировку только из переданного списка упражнений.

Важно:
- Нельзя придумывать новые упражнения.
- Нельзя использовать упражнения вне списка.
- Ответ должен быть только в формате JSON.
- Без markdown.
- Без пояснений до или после JSON.

Формат ответа:
{
  "text": "краткое описание тренировки",
  "recommendedIds": [1, 5, 8]
}
`.trim();



function CustomWorkout() {
  const [formData, setFormData] = useState({
    gender: "",
    age: "",
    height: "",
    weight: "",
    level: "beginner",
    targetGroups: [],
    duration: 30,
  });
  const [isResultView, setIsResultView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState({
    text: "",
    recommendedIds: [],
    exercises: [],
  });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [completedExerciseIds, setCompletedExerciseIds] = useState([]);

  useEffect(() => {
    if (!selectedVideo) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedVideo]);

  const levelMap = {
    beginner: ["junior"],
    intermediate: ["junior", "middle"],
    professional: ["junior", "middle", "hard"],
  };

  const targetGroupMap = {
    Руки: ["Бицепс", "Трицепс", "Предплечье"],
    Спина: [
      "Широчайшие мышцы",
      "Верх спины",
      "Низ спины",
      "Трапеция",
      "Трапецивидная мышца",
    ],
    Плечи: ["Плечи"],
    Грудь: ["Грудь"],
    Ноги: [
      "Квадрицепс",
      "Бицепс бедра",
      "Икроножные мышцы",
      "Ягодицы",
      "Приводящая мышца",
      "Колени",
    ],
    Разминка: [],
    Растяжка: [],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration" ? Number(value) : value,
    }));
  };

  const handleCheckboxChange = (group) => {
    setFormData((prev) => {
      const isSelected = prev.targetGroups.includes(group);

      return {
        ...prev,
        targetGroups: isSelected
          ? prev.targetGroups.filter((g) => g !== group)
          : [...prev.targetGroups, group],
      };
    });
  };

  const parseDurationToMinutes = (durationString) => {
    if (!durationString) return 0;

    const numbers = durationString.match(/\d+/g);
    if (!numbers || numbers.length === 0) return 0;

    if (numbers.length === 1) return Number(numbers[0]);

    return Math.round((Number(numbers[0]) + Number(numbers[1])) / 2);
  };

  const getAllowedMuscles = (targetGroups) => {
    const muscles = targetGroups.flatMap((group) => targetGroupMap[group] || []);
    return [...new Set(muscles)];
  };

  const isWarmupExercise = (exercise) =>
    exercise.category === "warmup" || exercise.muscleGroup.includes("Разминка");

  const isStretchExercise = (exercise) =>
    exercise.category === "stretch" || exercise.muscleGroup.includes("Растяжка");

  const getFilteredExercises = ({ level, targetGroups, duration }) => {
    const allowedLevels = levelMap[level] || [];
    const allowedMuscles = getAllowedMuscles(targetGroups);

    const filtered = exercisesDatabase.filter((exercise) => {
      const levelMatch = allowedLevels.includes(exercise.level);
      const specialMatch = isWarmupExercise(exercise) || isStretchExercise(exercise);

      const muscleMatch =
        specialMatch ||
        allowedMuscles.length === 0 ||
        exercise.muscleGroup.some((muscle) => allowedMuscles.includes(muscle));

      return levelMatch && muscleMatch;
    });

    const warmupExercise = filtered.find((exercise) => isWarmupExercise(exercise));
    const stretchExercise = filtered.find((exercise) => isStretchExercise(exercise));
    const mainExercises = filtered.filter(
      (exercise) => !isWarmupExercise(exercise) && !isStretchExercise(exercise)
    );

    const mandatoryDuration =
      (warmupExercise ? parseDurationToMinutes(warmupExercise.duration) : 0) +
      (stretchExercise ? parseDurationToMinutes(stretchExercise.duration) : 0);
    const totalDuration = Number(duration);
    const durationForMain = Math.max(totalDuration - mandatoryDuration, 0);

    // Подрезаем основную часть под примерное время тренировки
    let totalTime = 0;
    const mainResult = [];

    for (const exercise of mainExercises) {
      const exerciseTime = parseDurationToMinutes(exercise.duration);

      if (totalTime + exerciseTime <= durationForMain) {
        mainResult.push(exercise);
        totalTime += exerciseTime;
      }
    }

    return [
      ...(warmupExercise ? [warmupExercise] : []),
      ...mainResult,
      ...(stretchExercise ? [stretchExercise] : []),
    ];
  };

  const buildPrompt = (data, availableExercises) => {
    return `
Ты — профессиональный фитнес-тренер.

Составь персональную тренировку ТОЛЬКО из упражнений, которые переданы ниже.
Запрещено придумывать новые упражнения.
Запрещено использовать упражнения, которых нет в списке.

Данные пользователя:
- Пол: ${data.gender === "male" ? "Мужской" : "Женский"}
- Возраст: ${data.age} лет
- Рост: ${data.height} см
- Вес: ${data.weight} кг
- Уровень подготовки: ${data.level}
- Целевые зоны: ${data.targetGroups.join(", ")}
- Длительность тренировки: ${data.duration} минут

Доступные упражнения:
${JSON.stringify(availableExercises, null, 2)}

Сделай ответ строго в JSON формате без markdown и без пояснений.

Формат ответа:
{
  "text": "краткое описание тренировки простым текстом",
  "recommendedIds": [1, 5, 8]
}

Требования:
1. Используй только упражнения из списка.
2. Расположи упражнения в логичном порядке.
3. Учитывай уровень подготовки пользователя.
4. Постарайся уложиться в указанное время.
5. recommendedIds должен быть массивом числовых id упражнений по порядку выполнения.
6. Если в доступных упражнениях есть разминка, она должна быть в начале списка.
7. Если в доступных упражнениях есть растяжка, она должна быть в конце списка.
`.trim();
  };

  const handleSendToAI = async (data) => {
    const availableExercises = getFilteredExercises(data);

    if (!availableExercises.length) {
      console.warn("Под выбранные параметры не найдено подходящих упражнений.");
      alert("Под выбранные параметры не найдено подходящих упражнений.");
      return;
    }

    const prompt = buildPrompt(data, availableExercises);

    console.log("Подходящие упражнения из базы:", availableExercises);
    console.log("Промпт для AI:", prompt);

    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          system: AI_SYSTEM_PROMPT,
          prompt,
          history: [],
          max_output_tokens: 5000,
        }),
      });

      const rawText = await response.text();
      console.log("RAW RESPONSE:", rawText);

      if (!response.ok) {
        console.error("Ошибка API:", rawText);
        alert("Ошибка при генерации тренировки.");
        return;
      }

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (error) {
        console.error("Сервер вернул не JSON:", rawText);
        alert("Сервер вернул некорректный ответ.");
        return;
      }

      console.log("Ответ AI:", result);

      const aiAnswer =
        result.response ||
        result.content ||
        result.answer ||
        result.result ||
        rawText;

      if (!aiAnswer) {
        console.error("Поле answer пустое:", result);
        alert("AI вернул пустой ответ. Смотри консоль.");
        return;
      }

      let parsedWorkout;
      try {
        parsedWorkout =
          typeof aiAnswer === "string" ? JSON.parse(aiAnswer) : aiAnswer;
      } catch (error) {
        console.error("Не удалось распарсить ответ AI как JSON:", aiAnswer);
        alert("AI вернул ответ не в JSON формате. Смотри консоль.");
        return;
      }

      const recommendedIds = Array.isArray(parsedWorkout.recommendedIds)
        ? parsedWorkout.recommendedIds.filter((id) => Number.isInteger(id))
        : [];

      if (!recommendedIds.length) {
        console.error("AI не вернул корректный массив recommendedIds:", parsedWorkout);
        alert("AI не вернул корректный массив id упражнений. Смотри консоль.");
        return;
      }

      const availableById = new Map(availableExercises.map((exercise) => [exercise.id, exercise]));
      const uniqueRecommendedIds = [...new Set(recommendedIds)].filter((id) =>
        availableById.has(id)
      );

      let recommendedExercises = uniqueRecommendedIds
        .map((id) => availableById.get(id))
        .filter(Boolean);

      if (!recommendedExercises.length) {
        console.error("Не удалось найти упражнения по returned id:", recommendedIds);
        alert("Не удалось найти упражнения по полученным id.");
        return;
      }

      const firstWarmup = availableExercises.find((exercise) => isWarmupExercise(exercise));
      const firstStretch = availableExercises.find((exercise) => isStretchExercise(exercise));

      if (firstWarmup && !recommendedExercises.some((exercise) => isWarmupExercise(exercise))) {
        recommendedExercises = [firstWarmup, ...recommendedExercises];
      }

      if (firstStretch && !recommendedExercises.some((exercise) => isStretchExercise(exercise))) {
        recommendedExercises = [...recommendedExercises, firstStretch];
      }

      const warmups = recommendedExercises.filter((exercise) => isWarmupExercise(exercise));
      const stretches = recommendedExercises.filter((exercise) => isStretchExercise(exercise));
      const mains = recommendedExercises.filter(
        (exercise) => !isWarmupExercise(exercise) && !isStretchExercise(exercise)
      );
      recommendedExercises = [...warmups, ...mains, ...stretches];
      const finalRecommendedIds = recommendedExercises.map((exercise) => exercise.id);

      console.log("Текст тренировки:", parsedWorkout.text);
      console.log("Рекомендуемые id упражнений:", recommendedIds);
      console.log("Рекомендуемые упражнения:", recommendedExercises);

      setAiResult({
        text: parsedWorkout.text || "Тренировка сформирована.",
        recommendedIds: finalRecommendedIds,
        exercises: recommendedExercises,
      });
      setCompletedExerciseIds([]);
      setIsResultView(true);
    } catch (error) {
      console.error("Ошибка при запросе к AI:", error);
      alert("Ошибка при отправке запроса.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendToAI(formData);
  };

  const levelRuMap = {
    junior: "Начинающий",
    middle: "Средний",
    hard: "Продвинутый",
  };

  const getExerciseBadge = (exercise) => {
    if (isWarmupExercise(exercise)) {
      return { text: "Разминка", className: styles.badgeWarmup };
    }
    if (isStretchExercise(exercise)) {
      return { text: "Растяжка", className: styles.badgeStretch };
    }
    return null;
  };

  const toggleExerciseComplete = (exerciseId) => {
    setCompletedExerciseIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Придумать свой план тренировок</h1>
      <p className={styles.description}>
        Заполните данные, чтобы мы составили идеальную программу для вас.
      </p>

      {!isResultView ? (
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.grid}>
            <div className={styles.inputGroup}>
              <label>Пол</label>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === "male"}
                    onChange={handleChange}
                    required
                  />
                  Мужской
                </label>

                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === "female"}
                    onChange={handleChange}
                  />
                  Женский
                </label>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Возраст</label>
              <input
                type="number"
                name="age"
                placeholder="25"
                value={formData.age}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Рост (см)</label>
              <input
                type="number"
                name="height"
                placeholder="180"
                value={formData.height}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Вес (кг)</label>
              <input
                type="number"
                name="weight"
                placeholder="75"
                value={formData.weight}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Уровень подготовки</label>
            <select name="level" value={formData.level} onChange={handleChange}>
              <option value="beginner">Начинающий</option>
              <option value="intermediate">Средний</option>
              <option value="professional">Профессионал</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Что тренируем?</label>
            <div className={styles.checkboxGrid}>
              {["Руки", "Спина", "Плечи", "Грудь", "Ноги", "Разминка", "Растяжка"].map((item) => (
                <label key={item} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.targetGroups.includes(item)}
                    onChange={() => handleCheckboxChange(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Время тренировки: {formData.duration} мин.</label>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className={styles.submitBtn}>
            {isLoading ? "Формируем..." : "Сформировать план"}
          </button>
        </form>
      ) : (
        <div className={styles.formCard}>
          <div className={styles.inputGroup}>
            <h2 className={styles.resultTitle}>Ваш персональный план</h2>
            <p className={styles.resultText}>{aiResult.text}</p>
          </div>

          <div className={styles.inputGroup}>
            <h3 className={styles.resultSubTitle}>Рекомендуемые упражнения</h3>
            {aiResult.exercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className={`${styles.exerciseCard} ${
                  completedExerciseIds.includes(exercise.id) ? styles.exerciseCardCompleted : ""
                }`}
                onClick={() => toggleExerciseComplete(exercise.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExerciseComplete(exercise.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={completedExerciseIds.includes(exercise.id)}
              >
                <span className={styles.exerciseCardHint} aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    className={styles.exerciseCardHintIcon}
                    focusable="false"
                  >
                    <path
                      d="M5 3.5l10.2 10.2-4.3.9 2.2 5.2-2.6 1.1-2.2-5.2-3.2 3.1z"
                      fill="currentColor"
                    />
                    <path
                      d="M15.5 4.5V2.8m3.2 3.5h1.7m-2.5 2.7 1.2 1.2m-5.8-4.1 1.2-1.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <p className={styles.exerciseTitle}>
                  <strong>{index + 1}. {exercise.title}</strong>
                  {completedExerciseIds.includes(exercise.id) && (
                    <span className={`${styles.exerciseBadge} ${styles.badgeCompleted}`}>
                      Выполнено
                    </span>
                  )}
                  {getExerciseBadge(exercise) && (
                    <span className={`${styles.exerciseBadge} ${getExerciseBadge(exercise).className}`}>
                      {getExerciseBadge(exercise).text}
                    </span>
                  )}
                </p>
                <p className={styles.exerciseMeta}>
                  <span className={styles.metaLabel}>Группы мышц: </span>
                  <span className={styles.metaValue}>{exercise.muscleGroup.join(", ")}</span>
                </p>
                <p className={styles.exerciseMeta}>
                  <span className={styles.metaLabel}>Уровень: </span>
                  <span className={styles.metaValue}>
                    {levelRuMap[exercise.level] || exercise.level}
                  </span>
                </p>
                <p className={styles.exerciseMeta}>
                  <span className={styles.metaLabel}>Подходы: </span>
                  <span className={styles.metaValue}>{exercise.sets}</span>
                </p>
                <p className={styles.exerciseMeta}>
                  <span className={styles.metaLabel}>Длительность: </span>
                  <span className={styles.metaValue}>{exercise.duration}</span>
                </p>
                {exercise.videoUrl ? (
                  <button
                    type="button"
                    className={styles.exerciseLink}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVideo({
                        url: exercise.videoUrl,
                        title: exercise.title,
                      });
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    Смотреть видео
                  </button>
                ) : (
                  <p className={styles.exerciseMeta}>Видео отсутствует</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!aiResult.recommendedIds.length && (
        <div className={`${styles.formCard} ${styles.fixedBlock}`}>
          <div className={styles.inputGroup}>
            <div className={styles.tabsRow}>
              <button
                type="button"
                className={`${styles.submitBtn} ${!isResultView ? styles.activeTab : ""}`}
                onClick={() => setIsResultView(false)}
              >
                Форма
              </button>
              <button
                type="button"
                className={`${styles.submitBtn} ${isResultView ? styles.activeTab : ""}`}
                onClick={() => setIsResultView(true)}
              >
                Ответ
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVideo && (
        <div className={styles.videoModalOverlay}>
          <button
            type="button"
            className={styles.close_button}
            onClick={() => setSelectedVideo(null)}
          >
            ╳
          </button>
          <div className={styles.videoModal}>
            <h3 className={styles.videoModalTitle}>{selectedVideo.title}</h3>
            <div className={styles.videoFrameWrap}>
              <iframe
                className={styles.videoFrame}
                src={selectedVideo.url.replace("watch?v=", "embed/")}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className={styles.loadingOverlay} aria-live="polite" aria-busy="true">
          <div className={styles.loadingSpinnerWrap}>
            <svg
              viewBox="0 0 50 50"
              className={styles.loadingSpinner}
              role="img"
              aria-label="Загрузка"
              focusable="false"
            >
              <circle
                className={styles.loadingSpinnerTrack}
                cx="25"
                cy="25"
                r="20"
                fill="none"
              />
              <circle
                className={styles.loadingSpinnerArc}
                cx="25"
                cy="25"
                r="20"
                fill="none"
              />
            </svg>
          </div>
        </div>
      )}
    </div>


  );
}

export default CustomWorkout;
