import React, { useEffect, useMemo, useState } from "react";
import {
  Dumbbell,
  Users,
  TrendingUp,
  Plus,
  X,
  Calendar,
  Award,
  LogOut,
  Shield,
  Lock,
  BarChart3,
  Target,
  Camera,
  Settings,
  UserPlus,
  UserMinus,
  RefreshCw,
  ListPlus,
  Trash2,
} from "lucide-react";

/**
 * Storage keys in KV:
 * - gym-users
 * - gym-workouts
 * - gym-goals
 * - gym-photos
 * - gym-exercises
 */

const DEFAULT_MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Glutes",
  "Core",
];

const DEFAULT_EXERCISES = [
  { name: "Bench Press", muscleGroups: ["Chest", "Triceps", "Shoulders"] },
  { name: "Squat", muscleGroups: ["Legs", "Glutes", "Core"] },
  { name: "Deadlift", muscleGroups: ["Back", "Legs", "Glutes", "Core"] },
  { name: "Overhead Press", muscleGroups: ["Shoulders", "Triceps"] },
  { name: "Pull-ups", muscleGroups: ["Back", "Biceps"] },
  { name: "Rows", muscleGroups: ["Back", "Biceps"] },
  { name: "Bicep Curls", muscleGroups: ["Biceps"] },
  { name: "Tricep Dips", muscleGroups: ["Triceps", "Chest"] },
  { name: "Leg Press", muscleGroups: ["Legs", "Glutes"] },
  { name: "Shoulder Press", muscleGroups: ["Shoulders", "Triceps"] },
  { name: "Lateral Raises", muscleGroups: ["Shoulders"] },
  { name: "Lunges", muscleGroups: ["Legs", "Glutes", "Core"] },
];

const DEFAULT_USERS = {
  ethan: { username: "Ethan", password: "ethan123", isAdmin: true },
  biensy: { username: "Biensy", password: "biensy123", isAdmin: false },
  brandon: { username: "Brandon", password: "brandon123", isAdmin: false },
  chat: { username: "Chat", password: "gpt123", isAdmin: true },
};

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function normalizeUserKey(username) {
  return String(username || "").trim().toLowerCase();
}

function asInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}
function asFloat(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Epley formula: 1RM = w * (1 + reps/30)
function estimate1RM(weight, reps) {
  const w = asFloat(weight);
  const r = asInt(reps);
  if (w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30);
}

function workoutVolume(sets, reps, weight) {
  const s = asInt(sets);
  const r = asInt(reps);
  const w = asFloat(weight);
  if (s <= 0 || r <= 0 || w <= 0) return 0;
  return s * r * w;
}

export default function GymTracker() {
  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Data
  const [users, setUsers] = useState({});
  const [workouts, setWorkouts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [exerciseCatalog, setExerciseCatalog] = useState([]); // [{name, muscleGroups[]}]

  // UI
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");

  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Workout form
  const [newWorkout, setNewWorkout] = useState({
    member: "",
    exercise: "",
    customExercise: "",
    sets: "",
    reps: "",
    weight: "",
    date: new Date().toISOString().split("T")[0],
    muscleGroupsOverride: [], // for custom workouts or overrides
  });

  // Goal form
  const [newGoal, setNewGoal] = useState({
    exercise: "",
    customExercise: "",
    targetWeight: "",
    targetDate: "",
    member: "",
  });

  // Photo form
  const [newPhoto, setNewPhoto] = useState({
    photoData: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    member: "",
  });

  // Admin: add exercise
  const [newExercise, setNewExercise] = useState({
    name: "",
    muscleGroups: [],
  });
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  // Admin: add user
  const [adminNewUser, setAdminNewUser] = useState({
    username: "",
    password: "",
    isAdmin: false,
  });

  // Admin: reset password
  const [adminReset, setAdminReset] = useState({
    userKey: "",
    newPassword: "",
  });

  // Admin: stats selection
  const [statsUser, setStatsUser] = useState(""); // userKey (lowercase)

  // --- Derived helpers ---
  const members = useMemo(() => {
    // list of display usernames (stable order-ish)
    const list = Object.values(users || {}).map((u) => u.username);
    // remove empties + dedupe
    return Array.from(new Set(list.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [users]);

  const isAdmin = !!currentUser?.isAdmin;

  const exerciseNameList = useMemo(() => {
    const base = (exerciseCatalog || []).map((e) => e.name);
    // Always allow a quick custom option
    return [...base, "Other (Custom)"];
  }, [exerciseCatalog]);

  const muscleMap = useMemo(() => {
    const map = {};
    (exerciseCatalog || []).forEach((e) => {
      map[e.name] = Array.isArray(e.muscleGroups) ? e.muscleGroups : [];
    });
    return map;
  }, [exerciseCatalog]);

  // --- API wrappers ---
  async function apiGet(key) {
    const res = await fetch(`/api/get-data?key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(`GET ${key} failed`);
    const json = await res.json();
    return json?.value ?? null;
  }

  async function apiSave(kind, payload) {
    const res = await fetch(`/api/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${kind} failed: ${txt}`);
    }
    return res.json().catch(() => ({}));
  }

  // --- Load on mount ---
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // USERS
      const usersRaw = await apiGet("gym-users").catch(() => null);
      const loadedUsers = usersRaw ? safeJsonParse(usersRaw, null) : null;
      const finalUsers = loadedUsers && typeof loadedUsers === "object" ? loadedUsers : DEFAULT_USERS;
      setUsers(finalUsers);

      if (!usersRaw) {
        await apiSave("save-users", { users: finalUsers });
      }

      // EXERCISES
      const exercisesRaw = await apiGet("gym-exercises").catch(() => null);
      const loadedExercises = exercisesRaw ? safeJsonParse(exercisesRaw, null) : null;
      const finalExercises =
        Array.isArray(loadedExercises) && loadedExercises.length > 0
          ? loadedExercises
          : DEFAULT_EXERCISES;
      setExerciseCatalog(finalExercises);

      if (!exercisesRaw) {
        await apiSave("save-exercises", { exercises: finalExercises });
      }

      // WORKOUTS
      const workoutsRaw = await apiGet("gym-workouts").catch(() => null);
      setWorkouts(workoutsRaw ? safeJsonParse(workoutsRaw, []) : []);

      // GOALS
      const goalsRaw = await apiGet("gym-goals").catch(() => null);
      setGoals(goalsRaw ? safeJsonParse(goalsRaw, []) : []);

      // PHOTOS
      const photosRaw = await apiGet("gym-photos").catch(() => null);
      setPhotos(photosRaw ? safeJsonParse(photosRaw, []) : []);
    } catch (err) {
      console.error("loadData error:", err);
      setUsers(DEFAULT_USERS);
      setExerciseCatalog(DEFAULT_EXERCISES);
      setWorkouts([]);
      setGoals([]);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }

  // --- Save helpers ---
  async function saveUsers(updatedUsers) {
    setUsers(updatedUsers);
    await apiSave("save-users", { users: updatedUsers });
  }
  async function saveWorkouts(updatedWorkouts) {
    setWorkouts(updatedWorkouts);
    await apiSave("save-workouts", { workouts: updatedWorkouts });
  }
  async function saveGoals(updatedGoals) {
    setGoals(updatedGoals);
    await apiSave("save-goals", { goals: updatedGoals });
  }
  async function savePhotos(updatedPhotos) {
    setPhotos(updatedPhotos);
    await apiSave("save-photos", { photos: updatedPhotos });
  }
  async function saveExercises(updatedExercises) {
    setExerciseCatalog(updatedExercises);
    await apiSave("save-exercises", { exercises: updatedExercises });
  }

  // --- Auth ---
  function handleLogin(e) {
    e.preventDefault();
    const key = normalizeUserKey(loginUsername);
    const u = users?.[key];

    if (u && u.password === loginPassword) {
      setIsLoggedIn(true);
      setCurrentUser(u);
      setLoginError("");
      setView("dashboard");

      // default member in forms
      const display = u.username;
      setNewWorkout((prev) => ({ ...prev, member: display }));
      setNewGoal((prev) => ({ ...prev, member: display }));
      setNewPhoto((prev) => ({ ...prev, member: display }));

      // admin stats selection defaults
      setStatsUser(key);
    } else {
      setLoginError("Invalid username or password");
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    setView("dashboard");
  }

  // --- Password change (self) ---
  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentUser) return;

    const userKey = normalizeUserKey(currentUser.username);
    const userRec = users?.[userKey];
    if (!userRec) {
      setPasswordError("User record not found.");
      return;
    }

    if (userRec.password !== passwordForm.currentPassword) {
      setPasswordError("Current password is incorrect");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    const updatedUsers = {
      ...users,
      [userKey]: { ...userRec, password: passwordForm.newPassword },
    };

    await saveUsers(updatedUsers);

    setPasswordSuccess("Password changed successfully!");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

    setTimeout(() => {
      setShowChangePassword(false);
      setPasswordSuccess("");
    }, 1200);
  }

  // --- Workouts ---
  function needsMuscleOverride(exerciseName) {
    if (!exerciseName) return false;
    if (exerciseName === "Other (Custom)") return true;
    const groups = muscleMap[exerciseName];
    return !Array.isArray(groups) || groups.length === 0;
  }

  async function addWorkout() {
    if (!currentUser) return;

    const chosen = newWorkout.exercise;
    const finalExercise =
      chosen === "Other (Custom)"
        ? String(newWorkout.customExercise || "").trim()
        : chosen;

    if (!finalExercise) return;

    const sets = asInt(newWorkout.sets);
    const reps = asInt(newWorkout.reps);

    if (sets <= 0 || reps <= 0) return;

    const shouldOverride = needsMuscleOverride(chosen) || chosen === "Other (Custom)";
    const overrideGroups = shouldOverride
      ? (newWorkout.muscleGroupsOverride || []).filter(Boolean)
      : [];

    const record = {
      ...newWorkout,
      id: Date.now(),
      member: newWorkout.member || currentUser.username,
      exercise: finalExercise,
      sets: String(newWorkout.sets),
      reps: String(newWorkout.reps),
      weight: String(newWorkout.weight || ""),
      muscleGroupsOverride: overrideGroups,
    };

    const updated = [...workouts, record];
    await saveWorkouts(updated);

    // reset form
    setNewWorkout({
      member: currentUser.username,
      exercise: "",
      customExercise: "",
      sets: "",
      reps: "",
      weight: "",
      date: new Date().toISOString().split("T")[0],
      muscleGroupsOverride: [],
    });
    setShowAddWorkout(false);
  }

  async function deleteWorkout(id) {
    const w = workouts.find((x) => x.id === id);
    if (!w || !currentUser) return;
    if (!isAdmin && w.member !== currentUser.username) return;

    const updated = workouts.filter((x) => x.id !== id);
    await saveWorkouts(updated);
  }

  // --- Goals ---
  async function addGoal() {
    if (!currentUser) return;

    const chosen = newGoal.exercise;
    const finalExercise =
      chosen === "Other (Custom)"
        ? String(newGoal.customExercise || "").trim()
        : chosen;

    if (!finalExercise || !newGoal.targetWeight || !newGoal.targetDate) return;

    const record = {
      ...newGoal,
      id: Date.now(),
      member: newGoal.member || currentUser.username,
      exercise: finalExercise,
      achieved: false,
    };

    const updated = [...goals, record];
    await saveGoals(updated);

    setNewGoal({
      exercise: "",
      customExercise: "",
      targetWeight: "",
      targetDate: "",
      member: currentUser.username,
    });
    setShowAddGoal(false);
  }

  async function deleteGoal(id) {
    const g = goals.find((x) => x.id === id);
    if (!g || !currentUser) return;
    if (!isAdmin && g.member !== currentUser.username) return;

    const updated = goals.filter((x) => x.id !== id);
    await saveGoals(updated);
  }

  async function toggleGoalAchieved(id) {
    const updated = goals.map((g) =>
      g.id === id ? { ...g, achieved: !g.achieved } : g
    );
    await saveGoals(updated);
  }

  // --- Photos ---
  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPhoto((prev) => ({ ...prev, photoData: reader.result }));
    reader.readAsDataURL(file);
  }

  async function addPhoto() {
    if (!currentUser) return;
    if (!newPhoto.photoData) return;

    const record = {
      ...newPhoto,
      id: Date.now(),
      member: newPhoto.member || currentUser.username,
    };

    const updated = [...photos, record];
    await savePhotos(updated);

    setNewPhoto({
      photoData: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      member: currentUser.username,
    });
    setShowAddPhoto(false);
  }

  async function deletePhoto(id) {
    const p = photos.find((x) => x.id === id);
    if (!p || !currentUser) return;
    if (!isAdmin && p.member !== currentUser.username) return;

    const updated = photos.filter((x) => x.id !== id);
    await savePhotos(updated);
  }

  // --- Stats helpers ---
  function resolveWorkoutMuscles(w) {
    const override = Array.isArray(w.muscleGroupsOverride) ? w.muscleGroupsOverride : [];
    if (override.length > 0) return override;
    return muscleMap[w.exercise] || [];
  }

  function getStats() {
    const totalWorkouts = workouts.length;
    const totalSets = workouts.reduce((sum, w) => sum + asInt(w.sets), 0);
    const totalVolume = workouts.reduce(
      (sum, w) => sum + workoutVolume(w.sets, w.reps, w.weight),
      0
    );

    const memberWorkouts = {};
    members.forEach((m) => {
      memberWorkouts[m] = workouts.filter((w) => w.member === m).length;
    });

    return { totalWorkouts, totalSets, totalVolume, memberWorkouts };
  }

  function getUserWorkouts(displayName) {
    return workouts.filter((w) => w.member === displayName);
  }

  function getPersonalStatsFor(displayName) {
    const myWorkouts = getUserWorkouts(displayName);

    const perExercise = {};
    myWorkouts.forEach((w) => {
      const ex = w.exercise;
      if (!perExercise[ex]) perExercise[ex] = [];
      perExercise[ex].push({
        date: w.date,
        weight: asFloat(w.weight),
        reps: asInt(w.reps),
        sets: asInt(w.sets),
        volume: workoutVolume(w.sets, w.reps, w.weight),
        est1rm: estimate1RM(w.weight, w.reps),
      });
    });

    const stats = Object.keys(perExercise)
      .map((exercise) => {
        const sessions = perExercise[exercise].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

        const maxWeight = Math.max(...sessions.map((s) => s.weight), 0);
        const best1RM = Math.max(...sessions.map((s) => s.est1rm), 0);
        const totalVolume = sessions.reduce((sum, s) => sum + s.volume, 0);

        const first = sessions[0]?.weight || 0;
        const last = sessions[sessions.length - 1]?.weight || 0;
        const improvement = first > 0 ? ((last - first) / first) * 100 : 0;

        return {
          exercise,
          sessions: sessions.length,
          personalRecord: maxWeight,
          best1RM,
          totalVolume,
          lastWeight: last,
          improvement: improvement.toFixed(1),
          trend: last > first ? "up" : last < first ? "down" : "stable",
        };
      })
      .sort((a, b) => b.sessions - a.sessions);

    const totalVolumeAll = myWorkouts.reduce(
      (sum, w) => sum + workoutVolume(w.sets, w.reps, w.weight),
      0
    );

    return { perExerciseStats: stats, totalVolumeAll };
  }

  function getMuscleGroupHeatmapFor(displayName) {
    const myWorkouts = getUserWorkouts(displayName);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recent = myWorkouts.filter((w) => new Date(w.date) >= sevenDaysAgo);

    const muscleCount = {};
    DEFAULT_MUSCLE_GROUPS.forEach((g) => (muscleCount[g] = 0));

    recent.forEach((w) => {
      const groups = resolveWorkoutMuscles(w);
      const add = asInt(w.sets) || 0;
      groups.forEach((g) => {
        muscleCount[g] = (muscleCount[g] || 0) + add;
      });
    });

    const maxSets = Math.max(...Object.values(muscleCount), 1);

    return Object.entries(muscleCount).map(([group, sets]) => ({
      group,
      sets,
      intensity: sets / maxSets,
    }));
  }

  function getMyGoals() {
    if (!currentUser) return [];
    return goals.filter((g) => g.member === currentUser.username);
  }

  function getMyPhotos() {
    if (!currentUser) return [];
    return photos
      .filter((p) => p.member === currentUser.username)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getGoalProgress(goal) {
    if (!currentUser) return "0";
    const my = workouts.filter(
      (w) => w.member === currentUser.username && w.exercise === goal.exercise
    );
    if (my.length === 0) return "0";
    const maxW = Math.max(...my.map((w) => asFloat(w.weight)), 0);
    const prog = (maxW / asFloat(goal.targetWeight)) * 100;
    return String(Math.min(prog, 100).toFixed(0));
  }

  // --- Admin: users + exercises ---
  async function adminAddUser() {
    setAdminError("");
    setAdminSuccess("");

    const username = String(adminNewUser.username || "").trim();
    const password = String(adminNewUser.password || "");
    if (!username) return setAdminError("Username is required.");
    if (password.length < 6) return setAdminError("Password must be at least 6 characters.");

    const key = normalizeUserKey(username);
    if (users[key]) return setAdminError("That user already exists.");

    const updated = {
      ...users,
      [key]: { username, password, isAdmin: !!adminNewUser.isAdmin },
    };

    await saveUsers(updated);
    setAdminSuccess(`User "${username}" added.`);
    setAdminNewUser({ username: "", password: "", isAdmin: false });
  }

  async function adminRemoveUser(userKey) {
    setAdminError("");
    setAdminSuccess("");

    if (!userKey || !users[userKey]) return;
    if (normalizeUserKey(currentUser?.username) === userKey) {
      return setAdminError("You can't delete the account you're currently logged into.");
    }

    const updated = { ...users };
    const removedName = updated[userKey]?.username;
    delete updated[userKey];

    await saveUsers(updated);
    setAdminSuccess(`Removed user "${removedName}".`);
  }

  async function adminResetPassword() {
    setAdminError("");
    setAdminSuccess("");

    const userKey = adminReset.userKey;
    const newPass = String(adminReset.newPassword || "");

    if (!userKey || !users[userKey]) return setAdminError("Select a user to reset.");
    if (newPass.length < 6) return setAdminError("New password must be at least 6 characters.");

    const updated = {
      ...users,
      [userKey]: { ...users[userKey], password: newPass },
    };

    await saveUsers(updated);
    setAdminSuccess(`Password reset for "${users[userKey].username}".`);
    setAdminReset({ userKey: "", newPassword: "" });
  }

  async function adminAddExercise() {
    setAdminError("");
    setAdminSuccess("");

    const name = String(newExercise.name || "").trim();
    if (!name) return setAdminError("Exercise name is required.");
    const groups = (newExercise.muscleGroups || []).filter(Boolean);
    if (groups.length === 0) return setAdminError("Pick at least 1 muscle group.");

    const exists = (exerciseCatalog || []).some(
      (e) => e.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) return setAdminError("That exercise already exists.");

    const updated = [...exerciseCatalog, { name, muscleGroups: groups }].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    await saveExercises(updated);

    setNewExercise({ name: "", muscleGroups: [] });
    setAdminSuccess(`Added exercise "${name}".`);
  }

  async function adminRemoveExercise(name) {
    setAdminError("");
    setAdminSuccess("");

    const updated = (exerciseCatalog || []).filter((e) => e.name !== name);
    await saveExercises(updated);
    setAdminSuccess(`Removed exercise "${name}".`);
  }

  // --- Render states ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="w-16 h-16 text-purple-400 animate-pulse mx-auto mb-4" />
          <p className="text-xl text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = getStats();
  const recentWorkouts = [...workouts].reverse().slice(0, 10);
  const myGoals = isLoggedIn ? getMyGoals() : [];
  const myPhotos = isLoggedIn ? getMyPhotos() : [];

  // user-dependent stats target
  const statsTargetDisplay = useMemo(() => {
    if (!currentUser) return "";
    if (!isAdmin) return currentUser.username;
    // admin: use selected userKey if set, else self
    const key = statsUser || normalizeUserKey(currentUser.username);
    return users?.[key]?.username || currentUser.username;
  }, [currentUser, isAdmin, statsUser, users]);

  const { perExerciseStats, totalVolumeAll } = isLoggedIn
    ? getPersonalStatsFor(statsTargetDisplay)
    : { perExerciseStats: [], totalVolumeAll: 0 };

  const muscleHeatmap = isLoggedIn
    ? getMuscleGroupHeatmapFor(statsTargetDisplay)
    : [];

  // --- Login screen ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Dumbbell className="w-16 h-16 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Gym Crew Tracker
            </h1>
            <p className="text-gray-400">Login to track your gains</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/50"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Main app ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <header className="bg-black/30 backdrop-blur-md border-b border-purple-500/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Gym Crew Tracker
                </h1>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  Welcome, {currentUser.username}
                  {isAdmin && (
                    <span className="flex items-center gap-1 bg-purple-600/30 px-2 py-0.5 rounded-full">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddWorkout(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 rounded-lg font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/50"
              >
                <Plus className="w-5 h-5" />
                Log Workout
              </button>

              <button
                onClick={() => setShowChangePassword(true)}
                className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-lg font-semibold hover:bg-white/20 transition-all"
                title="Change password"
              >
                <Lock className="w-5 h-5" />
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 px-4 py-2 rounded-lg font-semibold hover:bg-red-600/30 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* NAV */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <NavButton
            active={view === "dashboard"}
            onClick={() => setView("dashboard")}
            icon={<TrendingUp className="w-5 h-5" />}
            label="Dashboard"
          />
          <NavButton
            active={view === "mystats"}
            onClick={() => setView("mystats")}
            icon={<BarChart3 className="w-5 h-5" />}
            label="Stats"
          />
          <NavButton
            active={view === "goals"}
            onClick={() => setView("goals")}
            icon={<Target className="w-5 h-5" />}
            label="Goals"
          />
          <NavButton
            active={view === "photos"}
            onClick={() => setView("photos")}
            icon={<Camera className="w-5 h-5" />}
            label="Progress Photos"
          />
          <NavButton
            active={view === "crew"}
            onClick={() => setView("crew")}
            icon={<Users className="w-5 h-5" />}
            label="The Crew"
          />
          {isAdmin && (
            <NavButton
              active={view === "admin"}
              onClick={() => setView("admin")}
              icon={<Settings className="w-5 h-5" />}
              label="Admin"
            />
          )}
        </div>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Total Workouts"
                value={stats.totalWorkouts}
                icon={<Award className="w-6 h-6 text-purple-400" />}
                accent="purple"
              />
              <StatCard
                title="Total Sets"
                value={stats.totalSets}
                icon={<Dumbbell className="w-6 h-6 text-pink-400" />}
                accent="pink"
              />
              <StatCard
                title="Total Volume"
                value={`${Math.round(stats.totalVolume)} kg`}
                icon={<BarChart3 className="w-6 h-6 text-blue-400" />}
                accent="blue"
              />
              <StatCard
                title="Your Workouts"
                value={stats.memberWorkouts[currentUser.username] || 0}
                icon={<Users className="w-6 h-6 text-green-400" />}
                accent="green"
              />
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-purple-400" />
                Muscle Group Heatmap (Last 7 Days) — {statsTargetDisplay}
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Uses your exercise’s muscle mapping. For custom workouts, you can pick muscle groups when logging.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {muscleHeatmap.map((m) => (
                  <div
                    key={m.group}
                    className="relative bg-black/30 border border-white/10 rounded-lg p-4 overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-purple-600/40 to-transparent transition-all"
                      style={{ opacity: m.intensity }}
                    />
                    <div className="relative z-10">
                      <h3 className="font-bold text-lg mb-1">{m.group}</h3>
                      <p className="text-2xl font-bold text-purple-300">{m.sets}</p>
                      <p className="text-xs text-gray-400">sets (last 7 days)</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-400" />
                Recent Workouts
              </h2>

              {recentWorkouts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No workouts logged yet. Start by adding your first workout!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentWorkouts.map((w) => {
                    const vol = workoutVolume(w.sets, w.reps, w.weight);
                    const oneRm = estimate1RM(w.weight, w.reps);
                    return (
                      <div
                        key={w.id}
                        className="bg-black/30 border border-white/10 rounded-lg p-4 flex items-center justify-between hover:bg-black/40 transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-purple-400">{w.member}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-300">{w.exercise}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {w.sets} sets × {w.reps} reps
                            {w.weight && ` @ ${w.weight}kg`}
                            <span className="ml-3">{w.date}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Volume: {Math.round(vol)} kg • Est. 1RM: {Math.round(oneRm)} kg
                          </div>
                        </div>

                        {(isAdmin || w.member === currentUser.username) && (
                          <button
                            onClick={() => deleteWorkout(w.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete workout"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATS (USER-DEPENDENT) */}
        {view === "mystats" && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                  Stats & Personal Records
                </h2>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Viewing:</span>
                    <select
                      value={statsUser || ""}
                      onChange={(e) => setStatsUser(e.target.value)}
                      className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    >
                      {Object.keys(users)
                        .sort((a, b) => users[a].username.localeCompare(users[b].username))
                        .map((k) => (
                          <option key={k} value={k}>
                            {users[k].username}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">User</p>
                  <p className="text-lg font-bold text-purple-300">{statsTargetDisplay}</p>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Volume</p>
                  <p className="text-lg font-bold text-pink-300">{Math.round(totalVolumeAll)} kg</p>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Exercises Logged</p>
                  <p className="text-lg font-bold text-blue-300">{perExerciseStats.length}</p>
                </div>
              </div>

              {perExerciseStats.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No workout data yet for {statsTargetDisplay}. Log workouts to see stats!
                </p>
              ) : (
                <div className="space-y-4">
                  {perExerciseStats.map((s) => (
                    <div
                      key={s.exercise}
                      className="bg-black/30 border border-white/10 rounded-lg p-5 hover:bg-black/40 transition-all"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-purple-300 mb-1">
                            {s.exercise}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {s.sessions} sessions • Volume: {Math.round(s.totalVolume)} kg
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-pink-400">
                            {Math.round(s.personalRecord)}kg
                          </div>
                          <p className="text-xs text-gray-400">Max Weight</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Best 1RM: {Math.round(s.best1RM)}kg
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Current Weight</p>
                          <p className="text-lg font-semibold text-blue-300">
                            {Math.round(s.lastWeight)}kg
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Improvement</p>
                          <p
                            className={`text-lg font-semibold ${
                              s.trend === "up"
                                ? "text-green-400"
                                : s.trend === "down"
                                ? "text-red-400"
                                : "text-gray-400"
                            }`}
                          >
                            {s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "→"}{" "}
                            {s.improvement}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* GOALS */}
        {view === "goals" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Target className="w-6 h-6 text-purple-400" />
                My Goals
              </h2>
              <button
                onClick={() => setShowAddGoal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Goal
              </button>
            </div>

            {myGoals.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">
                  No goals set yet. Set your first goal to track progress!
                </p>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 rounded-lg font-semibold hover:from-green-500 hover:to-emerald-500 transition-all"
                >
                  Set Your First Goal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myGoals.map((goal) => {
                  const progress = getGoalProgress(goal);
                  const daysLeft = Math.ceil(
                    (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={goal.id}
                      className={`bg-white/10 backdrop-blur-md border rounded-xl p-6 relative overflow-hidden ${
                        goal.achieved ? "border-green-500/50" : "border-white/20"
                      }`}
                    >
                      {goal.achieved && (
                        <div className="absolute top-4 right-4">
                          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            Achieved!
                          </div>
                        </div>
                      )}

                      <h3 className="text-xl font-bold mb-2">{goal.exercise}</h3>
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Target:</span>
                          <span className="font-semibold text-purple-300">
                            {goal.targetWeight}kg
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Due Date:</span>
                          <span
                            className={`font-semibold ${
                              daysLeft < 0 ? "text-red-400" : "text-blue-300"
                            }`}
                          >
                            {daysLeft < 0 ? "Overdue" : `${daysLeft} days left`}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="font-semibold">{progress}%</span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              Number(progress) >= 100
                                ? "bg-green-500"
                                : "bg-gradient-to-r from-purple-600 to-pink-600"
                            }`}
                            style={{ width: `${Math.min(Number(progress), 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleGoalAchieved(goal.id)}
                          className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                            goal.achieved
                              ? "bg-gray-600 hover:bg-gray-500"
                              : "bg-green-600 hover:bg-green-500"
                          }`}
                        >
                          {goal.achieved ? "Mark Incomplete" : "Mark Achieved"}
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
                          title="Delete goal"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PHOTOS */}
        {view === "photos" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Camera className="w-6 h-6 text-purple-400" />
                Progress Photos
              </h2>
              <button
                onClick={() => setShowAddPhoto(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-lg font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Photo
              </button>
            </div>

            {myPhotos.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">
                  No progress photos yet. Upload your first photo!
                </p>
                <button
                  onClick={() => setShowAddPhoto(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 rounded-lg font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all"
                >
                  Upload First Photo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {myPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
                  >
                    <div className="aspect-square bg-black/30 relative overflow-hidden">
                      <img
                        src={photo.photoData}
                        alt={photo.description || "Progress photo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-400 mb-2">{photo.date}</p>
                      {photo.description && <p className="text-sm mb-3">{photo.description}</p>}
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="w-full py-2 bg-red-600/20 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREW */}
        {view === "crew" && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">The Crew Leaderboard</h2>
            <div className="space-y-4">
              {members
                .map((m) => ({ member: m, count: stats.memberWorkouts[m] || 0 }))
                .sort((a, b) => b.count - a.count)
                .map((data, idx) => (
                  <div
                    key={data.member}
                    className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-xl">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {data.member}
                          {normalizeUserKey(data.member) &&
                            Object.values(users).find(
                              (u) => u.username === data.member && u.isAdmin
                            ) && (
                              <span className="flex items-center gap-1 bg-purple-600/30 px-2 py-0.5 rounded-full text-xs">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                        </h3>
                        <p className="text-sm text-gray-400">{data.count} workouts logged</p>
                      </div>
                    </div>
                    {data.count > 0 && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-400">{data.count}</div>
                        <div className="text-xs text-gray-400">sessions</div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ADMIN */}
        {view === "admin" && isAdmin && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Settings className="w-6 h-6 text-purple-400" />
                Admin Panel
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Manage users and the workout menu (exercise list + muscle mapping).
              </p>

              {adminError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
                  {adminError}
                </div>
              )}
              {adminSuccess && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-3 text-green-300 text-sm mb-4">
                  {adminSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Management */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-300" />
                    User Management
                  </h3>

                  <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={adminNewUser.username}
                        onChange={(e) => setAdminNewUser((p) => ({ ...p, username: e.target.value }))}
                        placeholder="New username"
                        className="bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                      <input
                        value={adminNewUser.password}
                        onChange={(e) => setAdminNewUser((p) => ({ ...p, password: e.target.value }))}
                        placeholder="Password (min 6)"
                        type="password"
                        className="bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={adminNewUser.isAdmin}
                        onChange={(e) =>
                          setAdminNewUser((p) => ({ ...p, isAdmin: e.target.checked }))
                        }
                      />
                      Make admin
                    </label>
                    <button
                      onClick={adminAddUser}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 py-2 rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all"
                    >
                      <UserPlus className="w-5 h-5" />
                      Add User
                    </button>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-gray-300" />
                      Reset Password
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={adminReset.userKey}
                        onChange={(e) => setAdminReset((p) => ({ ...p, userKey: e.target.value }))}
                        className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">Select user…</option>
                        {Object.keys(users)
                          .sort((a, b) => users[a].username.localeCompare(users[b].username))
                          .map((k) => (
                            <option key={k} value={k}>
                              {users[k].username}
                            </option>
                          ))}
                      </select>
                      <input
                        value={adminReset.newPassword}
                        onChange={(e) =>
                          setAdminReset((p) => ({ ...p, newPassword: e.target.value }))
                        }
                        placeholder="New password (min 6)"
                        type="password"
                        className="bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button
                      onClick={adminResetPassword}
                      className="w-full mt-3 flex items-center justify-center gap-2 bg-white/10 border border-white/20 py-2 rounded-lg font-semibold hover:bg-white/20 transition-all"
                    >
                      <Lock className="w-5 h-5" />
                      Reset Password
                    </button>
                  </div>

                  <div className="border-t border-white/10 mt-4 pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <UserMinus className="w-4 h-4 text-gray-300" />
                      Remove User
                    </h4>
                    <div className="space-y-2">
                      {Object.keys(users)
                        .sort((a, b) => users[a].username.localeCompare(users[b].username))
                        .map((k) => (
                          <div
                            key={k}
                            className="flex items-center justify-between bg-black/30 border border-white/10 rounded-lg px-3 py-2"
                          >
                            <div className="text-sm">
                              <span className="font-semibold text-purple-300">
                                {users[k].username}
                              </span>{" "}
                              {users[k].isAdmin && (
                                <span className="ml-2 text-xs bg-purple-600/30 px-2 py-0.5 rounded-full">
                                  Admin
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => adminRemoveUser(k)}
                              className="text-red-300 hover:text-red-200 transition-colors"
                              title="Remove user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Exercise Management */}
                <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-purple-300" />
                    Workout Menu (Exercises)
                  </h3>

                  <div className="space-y-3 mb-6">
                    <input
                      value={newExercise.name}
                      onChange={(e) => setNewExercise((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Exercise name (e.g. Incline Bench)"
                      className="bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    />

                    <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-2">
                        Muscle groups (for heatmap + analytics)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_MUSCLE_GROUPS.map((g) => {
                          const checked = newExercise.muscleGroups.includes(g);
                          return (
                            <label
                              key={g}
                              className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${
                                checked
                                  ? "bg-purple-600/40 border-purple-500/50"
                                  : "bg-white/5 border-white/10 hover:bg-white/10"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={(e) => {
                                  setNewExercise((p) => {
                                    const set = new Set(p.muscleGroups);
                                    if (e.target.checked) set.add(g);
                                    else set.delete(g);
                                    return { ...p, muscleGroups: Array.from(set) };
                                  });
                                }}
                              />
                              {g}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={adminAddExercise}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 py-2 rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      Add Exercise
                    </button>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h4 className="font-semibold mb-3">Current Exercises</h4>
                    <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
                      {exerciseCatalog
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((ex) => (
                          <div
                            key={ex.name}
                            className="bg-black/30 border border-white/10 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-purple-300">{ex.name}</p>
                                <p className="text-xs text-gray-400">
                                  {Array.isArray(ex.muscleGroups) && ex.muscleGroups.length
                                    ? ex.muscleGroups.join(", ")
                                    : "No muscle groups set"}
                                </p>
                              </div>
                              <button
                                onClick={() => adminRemoveExercise(ex.name)}
                                className="text-red-300 hover:text-red-200 transition-colors"
                                title="Remove exercise"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => {
                    setAdminError("");
                    setAdminSuccess("");
                    loadData();
                  }}
                  className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-lg font-semibold hover:bg-white/20 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reload From Storage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Change Password */}
      {showChangePassword && (
        <Modal onClose={() => setShowChangePassword(false)} title="Change Password" icon={<Lock className="w-6 h-6 text-purple-400" />}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Field label="Current Password">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </Field>

            <Field label="New Password">
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </Field>

            <Field label="Confirm New Password">
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </Field>

            {passwordError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg px-4 py-3 text-green-300 text-sm">
                {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/50"
            >
              Change Password
            </button>
          </form>
        </Modal>
      )}

      {/* Add Workout */}
      {showAddWorkout && (
        <Modal onClose={() => setShowAddWorkout(false)} title="Log Workout" icon={<Dumbbell className="w-6 h-6 text-purple-400" />}>
          <div className="space-y-4">
            {isAdmin ? (
              <Field label="Member (Admin can log for anyone)">
                <select
                  value={newWorkout.member}
                  onChange={(e) => setNewWorkout((p) => ({ ...p, member: e.target.value }))}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  {members.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg px-4 py-3">
                <p className="text-sm text-purple-300">
                  Logging workout for: <span className="font-bold">{currentUser.username}</span>
                </p>
              </div>
            )}

            <Field label="Exercise">
              <select
                value={newWorkout.exercise}
                onChange={(e) =>
                  setNewWorkout((p) => ({
                    ...p,
                    exercise: e.target.value,
                    // reset override when changing exercise
                    muscleGroupsOverride: [],
                    customExercise: "",
                  }))
                }
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select exercise</option>
                {exerciseNameList.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            </Field>

            {newWorkout.exercise === "Other (Custom)" && (
              <Field label="Custom Exercise Name">
                <input
                  type="text"
                  value={newWorkout.customExercise}
                  onChange={(e) => setNewWorkout((p) => ({ ...p, customExercise: e.target.value }))}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Enter exercise name"
                  required
                />
              </Field>
            )}

            {/* Muscle override for custom or unmapped */}
            {(needsMuscleOverride(newWorkout.exercise) || newWorkout.exercise === "Other (Custom)") && (
              <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-300 mb-2">
                  Muscle Groups (for heatmap)
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Pick the muscles this workout targets.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_MUSCLE_GROUPS.map((g) => {
                    const checked = newWorkout.muscleGroupsOverride.includes(g);
                    return (
                      <label
                        key={g}
                        className={`text-xs px-3 py-1 rounded-full border cursor-pointer ${
                          checked
                            ? "bg-purple-600/40 border-purple-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={(e) => {
                            setNewWorkout((p) => {
                              const set = new Set(p.muscleGroupsOverride || []);
                              if (e.target.checked) set.add(g);
                              else set.delete(g);
                              return { ...p, muscleGroupsOverride: Array.from(set) };
                            });
                          }}
                        />
                        {g}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Field label="Sets">
                <input
                  type="number"
                  value={newWorkout.sets}
                  onChange={(e) => setNewWorkout((p) => ({ ...p, sets: e.target.value }))}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="3"
                />
              </Field>

              <Field label="Reps">
                <input
                  type="number"
                  value={newWorkout.reps}
                  onChange={(e) => setNewWorkout((p) => ({ ...p, reps: e.target.value }))}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="10"
                />
              </Field>

              <Field label="Weight (kg)">
                <input
                  type="number"
                  value={newWorkout.weight}
                  onChange={(e) => setNewWorkout((p) => ({ ...p, weight: e.target.value }))}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="50"
                />
              </Field>
            </div>

            <Field label="Date">
              <input
                type="date"
                value={newWorkout.date}
                onChange={(e) => setNewWorkout((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </Field>

            <div className="bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-gray-300">
              <p className="text-xs text-gray-400 mb-1">Auto-calculated</p>
              <p>
                Volume:{" "}
                <span className="font-semibold text-pink-300">
                  {Math.round(workoutVolume(newWorkout.sets, newWorkout.reps, newWorkout.weight))} kg
                </span>
                {"  •  "}
                Est. 1RM:{" "}
                <span className="font-semibold text-purple-300">
                  {Math.round(estimate1RM(newWorkout.weight, newWorkout.reps))} kg
                </span>
              </p>
            </div>

            <button
              onClick={addWorkout}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/50"
            >
              Add Workout
            </button>
          </div>
        </Modal>
      )}

      {/* Add Goal */}
      {showAddGoal && (
        <Modal onClose={() => setShowAddGoal(false)} title="Set New Goal" icon={<Target className="w-6 h-6 text-green-400" />}>
          <div className="space-y-4">
            <Field label="Exercise">
              <select
                value={newGoal.exercise}
                onChange={(e) => setNewGoal((p) => ({ ...p, exercise: e.target.value, customExercise: "" }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              >
                <option value="">Select exercise</option>
                {exerciseNameList.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            </Field>

            {newGoal.exercise === "Other (Custom)" && (
              <Field label="Custom Exercise Name">
                <input
                  type="text"
                  value={newGoal.customExercise}
                  onChange={(e) => setNewGoal((p) => ({ ...p, customExercise: e.target.value }))}
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                  placeholder="Enter exercise name"
                  required
                />
              </Field>
            )}

            <Field label="Target Weight (kg)">
              <input
                type="number"
                value={newGoal.targetWeight}
                onChange={(e) => setNewGoal((p) => ({ ...p, targetWeight: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                placeholder="100"
              />
            </Field>

            <Field label="Target Date">
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              />
            </Field>

            <button
              onClick={addGoal}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-3 rounded-lg font-bold hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/50"
            >
              Set Goal
            </button>
          </div>
        </Modal>
      )}

      {/* Add Photo */}
      {showAddPhoto && (
        <Modal onClose={() => setShowAddPhoto(false)} title="Add Progress Photo" icon={<Camera className="w-6 h-6 text-blue-400" />}>
          <div className="space-y-4">
            <Field label="Upload Photo">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer hover:file:bg-purple-500"
              />
            </Field>

            {newPhoto.photoData && (
              <div className="aspect-square bg-black/30 rounded-lg overflow-hidden">
                <img src={newPhoto.photoData} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            <Field label="Description (Optional)">
              <textarea
                value={newPhoto.description}
                onChange={(e) => setNewPhoto((p) => ({ ...p, description: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
                placeholder="Add a note about this photo..."
              />
            </Field>

            <Field label="Date">
              <input
                type="date"
                value={newPhoto.date}
                onChange={(e) => setNewPhoto((p) => ({ ...p, date: e.target.value }))}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </Field>

            <button
              onClick={addPhoto}
              disabled={!newPhoto.photoData}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-3 rounded-lg font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Photo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --- Small components --- */

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
        active ? "bg-purple-600 shadow-lg shadow-purple-500/50" : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, accent }) {
  const accentMap = {
    purple: "from-purple-600/20 to-purple-800/20 border-purple-500/30 text-purple-300",
    pink: "from-pink-600/20 to-pink-800/20 border-pink-500/30 text-pink-300",
    blue: "from-blue-600/20 to-blue-800/20 border-blue-500/30 text-blue-300",
    green: "from-green-600/20 to-green-800/20 border-green-500/30 text-green-300",
  };
  const cls = accentMap[accent] || accentMap.purple;

  return (
    <div className={`bg-gradient-to-br ${cls} backdrop-blur-md border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl md:text-4xl font-bold text-white">{value}</p>
    </div>
  );
}

function Modal({ title, icon, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2 text-gray-300">{label}</label>
      {children}
    </div>
  );
}
