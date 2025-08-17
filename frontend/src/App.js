import React, { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Alert, AlertDescription } from './components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Trophy, Brain, Clock, DollarSign, Star, Users, Target, Zap, CheckCircle, XCircle, ArrowRight, LogOut } from 'lucide-react';

// Context for user authentication
const AuthContext = createContext();

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/api/user/profile');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading AI Quiz Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {user ? <Dashboard /> : <AuthPage />}
      </div>
    </AuthContext.Provider>
  );
}

function AuthPage() {
  const { setUser } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await api.post(endpoint, formData);
      
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">AI Quiz Pro</h1>
          <p className="text-slate-600">Play smart, earn real money</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome Back' : 'Join AI Quiz Pro'}
            </CardTitle>
            <CardDescription>
              {isLogin ? 'Sign in to continue earning' : 'Start your earning journey today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label>Full Name</Label>
                  <Input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                    className="mt-1"
                  />
                </div>
              )}
              
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  className="mt-1"
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('play');
  const [categories, setCategories] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [appStats, setAppStats] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchLeaderboard();
    fetchHistory();
    fetchAppStats();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/quiz/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/api/leaderboard');
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/api/user/history');
      setHistory(response.data.history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchAppStats = async () => {
    try {
      const response = await api.get('/api/stats');
      setAppStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">AI Quiz Pro</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-600">Welcome back,</p>
                <p className="font-semibold text-slate-800">{user?.full_name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${user?.wallet_balance?.toFixed(2) || '0.00'}
                </Badge>
                <Badge variant="outline">
                  <Star className="h-3 w-3 mr-1" />
                  {user?.total_points || 0} pts
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="play" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Play Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="play">
            <PlayQuizTab categories={categories} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <LeaderboardTab leaderboard={leaderboard} appStats={appStats} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab history={history} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PlayQuizTab({ categories }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);

  const startQuiz = async () => {
    if (!selectedCategory || !selectedDifficulty) {
      alert('Please select category and difficulty');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/quiz/generate', {
        category: selectedCategory,
        difficulty: selectedDifficulty,
        num_questions: numQuestions
      });
      setQuiz(response.data);
    } catch (error) {
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (quiz) {
    return <QuizPlayer quiz={quiz} onComplete={() => setQuiz(null)} />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-6 w-6 text-blue-600" />
            <span>Start New Quiz</span>
          </CardTitle>
          <CardDescription>
            Choose your category and difficulty to begin earning points
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy (10 pts/question)</SelectItem>
                  <SelectItem value="Medium">Medium (20 pts/question)</SelectItem>
                  <SelectItem value="Hard">Hard (30 pts/question)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Number of Questions</Label>
            <Select value={numQuestions.toString()} onValueChange={(value) => setNumQuestions(parseInt(value))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={startQuiz} 
            disabled={loading || !selectedCategory || !selectedDifficulty}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? 'Generating Quiz...' : 'Start Quiz'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-green-800">Earn Real Money</h3>
            <p className="text-sm text-green-600">1 point = $0.01</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Brain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-800">AI Generated</h3>
            <p className="text-sm text-blue-600">Fresh questions every time</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-800">Compete & Win</h3>
            <p className="text-sm text-purple-600">Climb the leaderboard</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuizPlayer({ quiz, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleTimeUp();
    }
  }, [timeLeft, quizCompleted]);

  const handleTimeUp = () => {
    // Auto-submit current answer (or -1 if none selected)
    const answer = {
      question_id: quiz.questions[currentQuestion].id,
      selected_answer: selectedAnswer !== null ? selectedAnswer : -1,
      time_taken: 30 - (timeLeft % 30)
    };
    
    const newAnswers = [...answers, answer];
    
    if (currentQuestion === quiz.questions.length - 1) {
      submitQuiz(newAnswers);
    } else {
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setTimeLeft(30); // Reset timer for next question
    }
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    const answer = {
      question_id: quiz.questions[currentQuestion].id,
      selected_answer: selectedAnswer,
      time_taken: 30 - (timeLeft % 30)
    };

    const newAnswers = [...answers, answer];

    if (currentQuestion === quiz.questions.length - 1) {
      submitQuiz(newAnswers);
    } else {
      setAnswers(newAnswers);
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setTimeLeft(30); // Reset timer for next question
    }
  };

  const submitQuiz = async (finalAnswers) => {
    setLoading(true);
    try {
      const response = await api.post('/api/quiz/submit', {
        quiz_id: quiz.quiz_id,
        answers: finalAnswers
      });
      setResults(response.data);
      setQuizCompleted(true);
    } catch (error) {
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (quizCompleted && results) {
    return <QuizResults results={results} onComplete={onComplete} />;
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Question {currentQuestion + 1} of {quiz.questions.length}</CardTitle>
            <CardDescription>{quiz.category} • {quiz.difficulty}</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-2xl font-bold text-red-600">
              <Clock className="h-5 w-5" />
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="w-full" />
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-slate-50 p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">{question.question}</h3>
          
          <div className="grid gap-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(index)}
                className={`p-4 text-left rounded-xl border-2 transition-all ${
                  selectedAnswer === index
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center">
                  <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-sm">
            Points: {question.points}
          </Badge>
          
          <Button
            onClick={handleNextQuestion}
            disabled={selectedAnswer === null || loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {currentQuestion === quiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuizResults({ results, onComplete }) {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl text-green-600">Quiz Completed!</CardTitle>
        <CardDescription>Here are your results</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{results.total_score}</div>
              <div className="text-sm text-green-700">Points Earned</div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{results.correct_answers}/{results.total_questions}</div>
              <div className="text-sm text-blue-700">Correct Answers</div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{results.accuracy.toFixed(1)}%</div>
              <div className="text-sm text-purple-700">Accuracy</div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">${results.money_earned.toFixed(2)}</div>
              <div className="text-sm text-yellow-700">Money Earned</div>
            </CardContent>
          </Card>
        </div>

        {/* Question by Question Results */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Question Results</h3>
          {results.results.map((result, index) => (
            <Card key={index} className={result.is_correct ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-slate-800">{result.question}</h4>
                  {result.is_correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Your answer: </span>
                    <span className={result.is_correct ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {result.options[result.selected_answer]}
                    </span>
                  </div>
                  {!result.is_correct && (
                    <div>
                      <span className="text-slate-600">Correct answer: </span>
                      <span className="text-green-600 font-medium">
                        {result.options[result.correct_answer]}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">{result.explanation}</p>
                </div>
                
                <div className="flex justify-between items-center mt-3 text-sm text-slate-600">
                  <span>Points: {result.points_earned}</span>
                  <span>Time: {result.time_taken.toFixed(1)}s</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={onComplete} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Play Another Quiz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardTab({ leaderboard, appStats }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <span>Top Players</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-400' : 'bg-slate-300'
                    }`}>
                      {player.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{player.full_name}</p>
                      <p className="text-sm text-slate-600">{player.total_quizzes} quizzes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{player.total_points} pts</p>
                    <p className="text-sm text-green-600">${player.wallet_balance.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{appStats.total_users || 0}</div>
                <div className="text-sm text-blue-700">Total Players</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{appStats.total_quizzes || 0}</div>
                <div className="text-sm text-green-700">Quizzes Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HistoryTab({ history }) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">No Quiz History</h3>
          <p className="text-slate-500">Complete your first quiz to see your history here!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz History</CardTitle>
        <CardDescription>Your recent quiz performances</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((quiz, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-slate-800">{quiz.category}</h3>
                <p className="text-sm text-slate-600">
                  {quiz.difficulty} • {new Date(quiz.completed_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{quiz.score} points</p>
                <p className="text-sm text-slate-600">{quiz.correct_answers} correct</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileTab({ user }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-600">Full Name</Label>
            <p className="font-semibold text-slate-800">{user?.full_name}</p>
          </div>
          <div>
            <Label className="text-slate-600">Email</Label>
            <p className="font-semibold text-slate-800">{user?.email}</p>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-600">Total Points</Label>
              <p className="text-2xl font-bold text-blue-600">{user?.total_points || 0}</p>
            </div>
            <div>
              <Label className="text-slate-600">Wallet Balance</Label>
              <p className="text-2xl font-bold text-green-600">${user?.wallet_balance?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{user?.total_quizzes || 0}</div>
              <div className="text-sm text-purple-700">Quizzes Played</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{user?.correct_answers || 0}</div>
              <div className="text-sm text-orange-700">Correct Answers</div>
            </div>
          </div>
          
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-lg font-semibold text-slate-700">
              Accuracy: {user?.total_quizzes > 0 ? ((user?.correct_answers || 0) / (user?.total_quizzes || 1) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;