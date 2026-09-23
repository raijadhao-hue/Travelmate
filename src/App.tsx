import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/Layout';

// ================= PUBLIC PAGES =================
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// ================= MAIN PAGES =================
import Dashboard from './pages/Dashboard';
import Welcome from './pages/Welcome';
import Profile from './pages/Profile';
import Destinations from './pages/Destinations';
import Plans from './pages/Plans';
import BrowseTrips from './pages/BrowseTrips';
import BuddyFinder from './pages/BuddyFinder';
import Matches from './pages/Matches';
import Feedback from './pages/Feedback';
import BlockedUsers from './pages/BlockedUser';
import Chat from './pages/Chat';
import History from './pages/History';
import EmergencyNearby from './pages/EmergencyNearby';
import MeetingPoint from './pages/MeetingPoint';
import BudgetSplit from './pages/BudgetSplit';

// ================= TRIP =================
import TripHistory from './pages/TripHistory';
import TripDetails from './pages/TripDetails';

// ================= ACCOUNT =================
import VerifyAccount from './pages/VerifyAccount';
import IdentityVerification from './pages/IdentityVerification';

// ================= SOCIAL / COMMUNITY =================
import TravelPost from './pages/TravelPost';
import PublicProfile from './pages/PublicProfile';

// ================= GROUP TRAVEL =================
import Groups from './pages/Groups';
import CreateGroup from './pages/CreateGroup';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* =====================================================
              PUBLIC ROUTES
          ===================================================== */}

          <Route
            path="/"
            element={<LandingPage />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<Signup />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          <Route
            path="/emergency-nearby"
            element={<EmergencyNearby />}
          />

          <Route
            path="/meeting-point/:tripId"
            element={<MeetingPoint />}
          />

          <Route
            path="/budget/:tripId"
            element={<BudgetSplit />}
          />


          {/* =====================================================
              PROTECTED ROUTES
          ===================================================== */}

          <Route element={<ProtectedRoute />}>

            {/* ================= HOME ================= */}

            <Route
              path="/home"
              element={<Dashboard />}
            />

            <Route
              path="/welcome"
              element={<Welcome />}
            />


            {/* ================= PROFILE ================= */}

            <Route
              path="/profile"
              element={<Profile />}
            />

            <Route
              path="/public-profile/:userId"
              element={<PublicProfile />}
            />


            {/* ================= TRAVEL ================= */}

            <Route
              path="/destinations"
              element={<Destinations />}
            />

            <Route
              path="/browse-trips"
              element={<BrowseTrips />}
            />

            {/* Trip Details */}
            <Route
              path="/trip/:tripId"
              element={<TripDetails />}
            />

            <Route
              path="/plans"
              element={<Plans />}
            />

            <Route
              path="/trip-history"
              element={<TripHistory />}
            />

            <Route
              path="/history"
              element={<History />}
            />


            {/* ================= BUDDY FINDER ================= */}

            <Route
              path="/buddies"
              element={<BuddyFinder />}
            />

            <Route
              path="/matches"
              element={<Matches />}
            />


            {/* ================= ACCOUNT VERIFICATION ================= */}

            <Route
              path="/verify-account"
              element={<VerifyAccount />}
            />

            <Route
              path="/identity-verification"
              element={<IdentityVerification />}
            />


            {/* ================= TRAVEL FEED ================= */}

            <Route
              path="/travel-post"
              element={<TravelPost />}
            />


            {/* ================= GROUP TRAVEL ================= */}

            <Route
              path="/groups"
              element={<Groups />}
            />

            <Route
              path="/create-group"
              element={<CreateGroup />}
            />

            <Route
              path="/group/:groupId"
              element={<Groups />}
            />


            {/* ================= CHAT ================= */}

            <Route
              path="/chat"
              element={<Chat />}
            />

            <Route
              path="/chat/:userId"
              element={<Chat />}
            />


            {/* ================= OTHER ================= */}

            <Route
              path="/feedback"
              element={<Feedback />}
            />

            <Route
              path="/blocked-users"
              element={<BlockedUsers />}
            />

          </Route>


          {/* =====================================================
              FALLBACK
          ===================================================== */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}