import React, { useState, useEffect } from 'react';
import { Dumbbell, Users, TrendingUp, Plus, X, Calendar, Award, LogOut, Shield, Lock, BarChart3, Target, Camera } from 'lucide-react';

export default function GymTracker() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState('dashboard');
  const [workouts, setWorkouts] = useState([]);
  const [users, setUsers] = useState({});
  const [goals, setGoals] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [newWorkout, setNewWorkout] = useState({
    member: '',
    exercise: '',
    customExercise: '',
    sets: '',
    reps: '',
    weight: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newGoal, setNewGoal] = useState({
    exercise: '',
    customExercise: '',
    targetWeight: '',
    targetDate: '',
    member: ''
  });
  const [newPhoto, setNewPhoto] = useState({
    photoData: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    member: ''
  });

  const exercises = [
    'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 
    'Pull-ups', 'Rows', 'Bicep Curls', 'Tricep Dips',
    'Leg Press', 'Shoulder Press', 'Lateral Raises', 'Lunges',
    'Other (Custom)'
  ];

  const muscleGroups = {
    'Bench Press': ['Chest', 'Triceps', 'Shoulders'],
    'Squat': ['Legs', 'Glutes'],
    'Deadlift': ['Back', 'Legs', 'Glutes'],
    'Overhead Press': ['Shoulders', 'Triceps'],
    'Pull-ups': ['Back', 'Biceps'],
    'Rows': ['Back', 'Biceps'],
    'Bicep Curls': ['Biceps'],
    'Tricep Dips': ['Triceps', 'Chest'],
    'Leg Press': ['Legs', 'Glutes'],
    'Shoulder Press': ['Shoulders', 'Triceps'],
    'Lateral Raises': ['Shoulders'],
    'Lunges': ['Legs', 'Glutes']
  };
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const usersResponse = await fetch('/api/get-data?key=gym-users');
      const usersData = await usersResponse.json();
      
      if (usersData.value) {
        setUsers(JSON.parse(usersData.value));
      } else {
        const defaultUsers = {
          ethan: { username: 'Ethan', password: 'ethan123', isAdmin: true },
          biensy: { username: 'Biensy', password: 'biensy123', isAdmin: false },
          brandon: { username: 'Brandon', password: 'brandon123', isAdmin: false }
        };
        setUsers(defaultUsers);
        await fetch('/api/save-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: defaultUsers })
        });
      }

      const workoutsResponse = await fetch('/api/get-data?key=gym-workouts');
      const workoutsData = await workoutsResponse.json();
      if (workoutsData.value) {
        setWorkouts(JSON.parse(workoutsData.value));
      }

      const goalsResponse = await fetch('/api/get-data?key=gym-goals');
      const goalsData = await goalsResponse.json();
      if (goalsData.value) {
        setGoals(JSON.parse(goalsData.value));
      }

      const photosResponse = await fetch('/api/get-data?key=gym-photos');
      const photosData = await photosResponse.json();
      if (photosData.value) {
        setPhotos(JSON.parse(photosData.value));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const defaultUsers = {
        ethan: { username: 'Ethan', password: 'ethan123', isAdmin: true },
        biensy: { username: 'Biensy', password: 'biensy123', isAdmin: false },
        brandon: { username: 'Brandon', password: 'brandon123', isAdmin: false }
      };
      setUsers(defaultUsers);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkouts = async (newWorkouts) => {
    try {
      await fetch('/api/save-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workouts: newWorkouts })
      });
    } catch (error) {
      console.error('Error saving workouts:', error);
    }
  };

  const saveUsers = async (newUsers) => {
    try {
      await fetch('/api/save-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: newUsers })
      });
    } catch (error) {
      console.error('Error saving users:', error);
    }
  };

  const saveGoals = async (newGoals) => {
    try {
      await fetch('/api/save-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: newGoals })
      });
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const savePhotos = async (newPhotos) => {
    try {
      await fetch('/api/save-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: newPhotos })
      });
    } catch (error) {
      console.error('Error saving photos:', error);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const userKey = loginUsername.toLowerCase();
    const user = users[userKey];
    
    if (user && user.password === loginPassword) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginError('');
      setNewWorkout({ ...newWorkout, member: user.username });
      setNewGoal({ ...newGoal, member: user.username });
      setNewPhoto({ ...newPhoto, member: user.username });
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setView('dashboard');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const userKey = currentUser.username.toLowerCase();
    
    if (users[userKey].password !== passwordForm.currentPassword) {
      setPasswordError('Current password is incorrect');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const updatedUsers = {
      ...users,
      [userKey]: { ...users[userKey], password: passwordForm.newPassword }
    };
    
    setUsers(updatedUsers);
    await saveUsers(updatedUsers);

    setPasswordSuccess('Password changed successfully!');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    setTimeout(() => {
      setShowChangePassword(false);
      setPasswordSuccess('');
    }, 2000);
  };

  const addWorkout = async () => {
    const finalExercise = newWorkout.exercise === 'Other (Custom)' 
      ? newWorkout.customExercise 
      : newWorkout.exercise;

    if (finalExercise && newWorkout.sets && newWorkout.reps) {
      const updatedWorkouts = [...workouts, { 
        ...newWorkout, 
        exercise: finalExercise,
        id: Date.now() 
      }];
      setWorkouts(updatedWorkouts);
      await saveWorkouts(updatedWorkouts);
      
      setNewWorkout({
        member: currentUser.username,
        exercise: '',
        customExercise: '',
        sets: '',
        reps: '',
        weight: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddWorkout(false);
    }
  };

  const addGoal = async () => {
    const finalExercise = newGoal.exercise === 'Other (Custom)' 
      ? newGoal.customExercise 
      : newGoal.exercise;

    if (finalExercise && newGoal.targetWeight && newGoal.targetDate) {
      const updatedGoals = [...goals, { 
        ...newGoal, 
        exercise: finalExercise,
        id: Date.now(),
        achieved: false
      }];
      setGoals(updatedGoals);
      await saveGoals(updatedGoals);
      
      setNewGoal({
        exercise: '',
        customExercise: '',
        targetWeight: '',
        targetDate: '',
        member: currentUser.username
      });
      setShowAddGoal(false);
    }
  };

  const addPhoto = async () => {
    if (newPhoto.photoData) {
      const updatedPhotos = [...photos, { 
        ...newPhoto, 
        id: Date.now()
      }];
      setPhotos(updatedPhotos);
      await savePhotos(updatedPhotos);
      
      setNewPhoto({
        photoData: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        member: currentUser.username
      });
      setShowAddPhoto(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhoto({ ...newPhoto, photoData: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteWorkout = async (id) => {
    const workout = workouts.find(w => w.id === id);
    if (currentUser.isAdmin || workout.member === currentUser.username) {
      const updatedWorkouts = workouts.filter(w => w.id !== id);
      setWorkouts(updatedWorkouts);
      await saveWorkouts(updatedWorkouts);
    }
  };

  const deleteGoal = async (id) => {
    const goal = goals.find(g => g.id === id);
    if (currentUser.isAdmin || goal.member === currentUser.username) {
      const updatedGoals = goals.filter(g => g.id !== id);
      setGoals(updatedGoals);
      await saveGoals(updatedGoals);
    }
  };

  const toggleGoalAchieved = async (id) => {
    const updatedGoals = goals.map(g => 
      g.id === id ? { ...g, achieved: !g.achieved } : g
    );
    setGoals(updatedGoals);
    await saveGoals(updatedGoals);
  };

  const deletePhoto = async (id) => {
    const photo = photos.find(p => p.id === id);
    if (currentUser.isAdmin || photo.member === currentUser.username) {
      const updatedPhotos = photos.filter(p => p.id !== id);
      setPhotos(updatedPhotos);
      await savePhotos(updatedPhotos);
    }
  };

  const getStats = () => {
    const members = ['Ethan', 'Biensy', 'Brandon'];
    const totalWorkouts = workouts.length;
    const totalSets = workouts.reduce((sum, w) => sum + parseInt(w.sets || 0), 0);
    const memberWorkouts = {};
    members.forEach(m => {
      memberWorkouts[m] = workouts.filter(w => w.member === m).length;
    });
    return { totalWorkouts, totalSets, memberWorkouts };
  };

  const getPersonalStats = () => {
    const myWorkouts = workouts.filter(w => w.member === currentUser.username);
    
    const exerciseStats = {};
    myWorkouts.forEach(w => {
      if (!exerciseStats[w.exercise]) {
        exerciseStats[w.exercise] = [];
      }
      exerciseStats[w.exercise].push({
        weight: parseFloat(w.weight) || 0,
        date: w.date,
        sets: parseInt(w.sets) || 0,
        reps: parseInt(w.reps) || 0
      });
    });

    const stats = Object.keys(exerciseStats).map(exercise => {
      const sessions = exerciseStats[exercise].sort((a, b) => new Date(a.date) - new Date(b.date));
      const maxWeight = Math.max(...sessions.map(s => s.weight));
      const firstWeight = sessions[0]?.weight || 0;
      const lastWeight = sessions[sessions.length - 1]?.weight || 0;
      const improvement = firstWeight > 0 ? ((lastWeight - firstWeight) / firstWeight * 100) : 0;
      
      return {
        exercise,
        personalRecord: maxWeight,
        sessions: sessions.length,
        improvement: improvement.toFixed(1),
        lastWeight: lastWeight,
        trend: lastWeight > firstWeight ? 'up' : lastWeight < firstWeight ? 'down' : 'stable'
      };
    }).sort((a, b) => b.sessions - a.sessions);

    return stats;
  };

  const getMuscleGroupHeatmap = () => {
    const myWorkouts = workouts.filter(w => w.member === currentUser.username);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentWorkouts = myWorkouts.filter(w => new Date(w.date) >= sevenDaysAgo);
    
    const muscleGroupCount = {
      'Chest': 0,
      'Back': 0,
      'Shoulders': 0,
      'Biceps': 0,
      'Triceps': 0,
      'Legs': 0,
      'Glutes': 0
    };

    recentWorkouts.forEach(w => {
      const groups = muscleGroups[w.exercise] || [];
      groups.forEach(group => {
        muscleGroupCount[group] = (muscleGroupCount[group] || 0) + parseInt(w.sets || 0);
      });
    });

    const maxSets = Math.max(...Object.values(muscleGroupCount), 1);
    
    return Object.entries(muscleGroupCount).map(([group, sets]) => ({
      group,
      sets,
      intensity: sets / maxSets
    }));
  };

  const getMyGoals = () => {
    return goals.filter(g => g.member === currentUser.username);
  };

  const getMyPhotos = () => {
    return photos.filter(p => p.member === currentUser.username).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getGoalProgress = (goal) => {
    const myWorkouts = workouts.filter(w => 
      w.member === currentUser.username && 
      w.exercise === goal.exercise
    );
    
    if (myWorkouts.length === 0) return 0;
    
    const maxWeight = Math.max(...myWorkouts.map(w => parseFloat(w.weight) || 0));
    const progress = (maxWeight / parseFloat(goal.targetWeight)) * 100;
    return Math.min(progress, 100).toFixed(0);
  };

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
  const members = ['Ethan', 'Biensy', 'Brandon'];
  const personalStats = isLoggedIn ? getPersonalStats() : [];
  const muscleHeatmap = isLoggedIn ? getMuscleGroupHeatmap() : [];
  const myGoals = isLoggedIn ? getMyGoals() : [];
  const myPhotos = isLoggedIn ? getMyPhotos() : [];

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
              <label className="block text-sm font-semibold mb-2 text-gray-300">Username</label>
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
              <label className="block text-sm font-semibold mb-2 text-gray-300">Password</label>
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
                  {currentUser.isAdmin && (
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
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setView('dashboard')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              view === 'dashboard'
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setView('mystats')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              view === 'mystats'
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            My Stats
          </button>
          <button
            onClick={() => setView('goals')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              view === 'goals'
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Target className="w-5 h-5" />
            Goals
          </button>
          <button
            onClick={() => setView('photos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              view === 'photos'
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Camera className="w-5 h-5" />
            Progress Photos
          </button>
          <button
            onClick={() => setView('crew')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              view === 'crew'
                ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Users className="w-5 h-5" />
            The Crew
          </button>
        </div>

    {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-md border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-purple-300 font-semibold">Total Workouts</h3>
                  <Award className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-4xl font-bold">{stats.totalWorkouts}</p>
              </div>
              <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 backdrop-blur-md border border-pink-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-pink-300 font-semibold">Total Sets</h3>
                  <Dumbbell className="w-6 h-6 text-pink-400" />
                </div>
                <p className="text-4xl font-bold">{stats.totalSets}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-md border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-blue-300 font-semibold">Your Workouts</h3>
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-4xl font-bold">{stats.memberWorkouts[currentUser.username] || 0}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-purple-400" />
                Muscle Group Heatmap (Last 7 Days)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {muscleHeatmap.map((muscle) => (
                  <div
                    key={muscle.group}
                    className="relative bg-black/30 border border-white/10 rounded-lg p-4 overflow-hidden"
                  >
                    <div 
                      className="absolute inset-0 bg-gradient-to-t from-purple-600/40 to-transparent transition-all"
                      style={{ opacity: muscle.intensity }}
                    ></div>
                    <div className="relative z-10">
                      <h3 className="font-bold text-lg mb-1">{muscle.group}</h3>
                      <p className="text-2xl font-bold text-purple-300">{muscle.sets}</p>
                      <p className="text-xs text-gray-400">sets</p>
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
                <p className="text-gray-400 text-center py-8">No workouts logged yet. Start by adding your first workout!</p>
              ) : (
                <div className="space-y-3">
                  {recentWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="bg-black/30 border border-white/10 rounded-lg p-4 flex items-center justify-between hover:bg-black/40 transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-purple-400">{workout.member}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-300">{workout.exercise}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {workout.sets} sets × {workout.reps} reps
                          {workout.weight && ` @ ${workout.weight}kg`}
                          <span className="ml-3">{workout.date}</span>
                        </div>
                      </div>
                      {(currentUser.isAdmin || workout.member === currentUser.username) && (
                        <button
                          onClick={() => deleteWorkout(workout.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    {view === 'mystats' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                My Progress & Personal Records
              </h2>
              {personalStats.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No workout data yet. Start logging workouts to see your stats!</p>
              ) : (
                <div className="space-y-4">
                  {personalStats.map((stat) => (
                    <div
                      key={stat.exercise}
                      className="bg-black/30 border border-white/10 rounded-lg p-5 hover:bg-black/40 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-purple-300 mb-1">{stat.exercise}</h3>
                          <p className="text-sm text-gray-400">{stat.sessions} sessions logged</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-pink-400">{stat.personalRecord}kg</div>
                          <p className="text-xs text-gray-400">Personal Record</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Current Weight</p>
                          <p className="text-lg font-semibold text-blue-300">{stat.lastWeight}kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Improvement</p>
                          <p className={`text-lg font-semibold ${
                            stat.trend === 'up' ? 'text-green-400' : 
                            stat.trend === 'down' ? 'text-red-400' : 
                            'text-gray-400'
                          }`}>
                            {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→'} {stat.improvement}%
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
  {view === 'goals' && (
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
                <p className="text-gray-400 mb-4">No goals set yet. Set your first goal to track your progress!</p>
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
                  const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={goal.id}
                      className={`bg-white/10 backdrop-blur-md border rounded-xl p-6 relative overflow-hidden ${
                        goal.achieved ? 'border-green-500/50' : 'border-white/20'
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
                          <span className="font-semibold text-purple-300">{goal.targetWeight}kg</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Due Date:</span>
                          <span className={`font-semibold ${daysLeft < 0 ? 'text-red-400' : 'text-blue-300'}`}>
                            {daysLeft < 0 ? 'Overdue' : `${daysLeft} days left`}
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
                              progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-purple-600 to-pink-600'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleGoalAchieved(goal.id)}
                          className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                            goal.achieved
                              ? 'bg-gray-600 hover:bg-gray-500'
                              : 'bg-green-600 hover:bg-green-500'
                          }`}
                        >
                          {goal.achieved ? 'Mark Incomplete' : 'Mark Achieved'}
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all"
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
  {view === 'photos' && (
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
                <p className="text-gray-400 mb-4">No progress photos yet. Upload your first photo to track your transformation!</p>
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
                        alt={photo.description || 'Progress photo'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-400 mb-2">{photo.date}</p>
                      {photo.description && (
                        <p className="text-sm mb-3">{photo.description}</p>
                      )}
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
          {view === 'crew' && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6">The Crew Leaderboard</h2>
            <div className="space-y-4">
              {members
                .map(member => ({ member, count: stats.memberWorkouts[member] || 0 }))
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
                          {data.member === 'Ethan' && (
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
      </div>

      {/* ✅ MODALS MUST LIVE INSIDE THIS ROOT RETURN */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            {/* ... unchanged modal content ... */}
          </div>
        </div>
      )}

      {showAddWorkout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            {/* ... unchanged modal content ... */}
          </div>
        </div>
      )}

      {showAddGoal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            {/* ... unchanged modal content ... */}
          </div>
        </div>
      )}

      {showAddPhoto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            {/* ... unchanged modal content ... */}
          </div>
        </div>
      )}

  {showChangePassword && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6 text-purple-400" />
            Change Password
          </h2>
          <button
            onClick={() => {
              setShowChangePassword(false);
              setPasswordError('');
              setPasswordSuccess('');
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

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
      </div>
    </div>
  )}
  {showAddWorkout && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Log Workout</h2>
          <button
            onClick={() => setShowAddWorkout(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          {currentUser.isAdmin && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Member (Admin can log for anyone)
              </label>
              <select
                value={newWorkout.member}
                onChange={(e) => setNewWorkout({ ...newWorkout, member: e.target.value })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          {!currentUser.isAdmin && (
            <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg px-4 py-3">
              <p className="text-sm text-purple-300">Logging workout for: <span className="font-bold">{currentUser.username}</span></p>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Exercise</label>
            <select
              value={newWorkout.exercise}
              onChange={(e) => setNewWorkout({ ...newWorkout, exercise: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Select exercise</option>
              {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          
          {newWorkout.exercise === 'Other (Custom)' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Custom Exercise Name</label>
              <input
                type="text"
                value={newWorkout.customExercise}
                onChange={(e) => setNewWorkout({ ...newWorkout, customExercise: e.target.value })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="Enter exercise name"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Sets</label>
              <input
                type="number"
                value={newWorkout.sets}
                onChange={(e) => setNewWorkout({ ...newWorkout, sets: e.target.value })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="3"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Reps</label>
              <input
                type="number"
                value={newWorkout.reps}
                onChange={(e) => setNewWorkout({ ...newWorkout, reps: e.target.value })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Weight (kg)</label>
              <input
                type="number"
                value={newWorkout.weight}
                onChange={(e) => setNewWorkout({ ...newWorkout, weight: e.target.value })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Date</label>
            <input
              type="date"
              value={newWorkout.date}
              onChange={(e) => setNewWorkout({ ...newWorkout, date: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={addWorkout}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/50"
          >
            Add Workout
          </button>
        </div>
      </div>
    </div>
  )}
  {showAddGoal && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-green-400" />
            Set New Goal
          </h2>
          <button
            onClick={() => setShowAddGoal(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Exercise</label>
            <select
              value={newGoal.exercise}
              onChange={(e) => setNewGoal({ ...newGoal, exercise: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
            >
              <option value="">Select exercise</option>
              {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>

          {newGoal.exercise === 'Other (Custom)' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Custom Exercise Name</label>
              <input
                type="text"
                value={newGoal.customExercise}
                onChange={(e) => setNewGoal({ ...newGoal, customExercise: e.target.value })}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
                placeholder="Enter exercise name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Target Weight (kg)</label>
            <input
              type="number"
              value={newGoal.targetWeight}
              onChange={(e) => setNewGoal({ ...newGoal, targetWeight: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Target Date</label>
            <input
              type="date"
              value={newGoal.targetDate}
              onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
            />
          </div>

          <button
            onClick={addGoal}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-3 rounded-lg font-bold hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/50"
          >
            Set Goal
          </button>
        </div>
      </div>
    </div>
  )}
  {showAddPhoto && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-400" />
            Add Progress Photo
          </h2>
          <button
            onClick={() => setShowAddPhoto(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Upload Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer hover:file:bg-purple-500"
            />
          </div>

          {newPhoto.photoData && (
            <div className="aspect-square bg-black/30 rounded-lg overflow-hidden">
              <img
                src={newPhoto.photoData}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Description (Optional)</label>
            <textarea
              value={newPhoto.description}
              onChange={(e) => setNewPhoto({ ...newPhoto, description: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
              placeholder="Add a note about this photo..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">Date</label>
            <input
              type="date"
              value={newPhoto.date}
              onChange={(e) => setNewPhoto({ ...newPhoto, date: e.target.value })}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={addPhoto}
            disabled={!newPhoto.photoData}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-3 rounded-lg font-bold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Photo
          </button>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
