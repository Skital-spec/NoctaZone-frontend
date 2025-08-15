import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import Home from './Pages/Home';
import CustomNavbar from './Components/CustomNavbar';
import PrivacyPolicy from './Pages/PrivacyPolicy';
import TermsOfUse from './Pages/TermsOfUse';
import ResponsibleGaming from './Pages/ResponsibleGaming';
import SupportPage from './Pages/SupportPage';
import About from './Pages/About';
import HowItWorks from './Pages/HowItWorks';
import TopNavbar from './Components/TopNavbar';
import SideNavbar from './Components/SideNavbar';
import MainLayout from './Components/MainLayout';
import Tournaments from './Pages/Tournaments';
import Help from './Pages/Help';
import Account from './Pages/Account';
import AddTournamentPage from './Pages/AddTournamentPage';
import TournamentDetails from './Pages/TournamentDetails';
import AdminTournamentsPage from './Pages/AdminTournamentsPage';
import EditTournamentPage from './Pages/EditTournamentPage';
import StkPushForm from './Pages/StkPushForm';
import PrivateChat from './Pages/PrivateChat';
import ChatWindow from './Pages/ChatWindow';
import MyZone from './Pages/MyZone';
import PublicChatModal from './Pages/PublicChatModal';
import TournamentsCarousel from './Components/TournamentsCarousel';
import OnlineUsersModal from './Pages/OnlineUsersModal';
import UserSearchLogic from './Pages/UserSearchLogic';
import Wallet from './Pages/Wallet';
// --- import the provider (NOT useContext) ---
import { WalletProvider } from './context/WalletContext';
import TournamentParticipants from './Pages/TournamentParticipants';
import CreateChallenge from './Pages/CreateChallenge';
import UserSelectionModal from './Components/UserSelectionModal';
import PaymentConfirmationModal from './Components/PaymentConfirmationModal';
import ChallengeDetails from './Pages/ChallengeDetails';

function App() {
  return (
    <div className="App">
      {/* Wrap your app with the WalletProvider so all pages can access the wallet */}
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<Home/>}/>
            {/* removed the invalid walletcontext route that tried to render a hook */}
            <Route path='/tournament/:id/participants' element={<TournamentParticipants/>}/>
            <Route path='/wallet' element={<Wallet/>}/>
            <Route path='/challengedetails' element={<ChallengeDetails/>}/>
            <Route path='/paymentconfirmationmodal' element={<PaymentConfirmationModal/>}/>
            <Route path='/userselectionmodal' element={<UserSelectionModal/>}/>
            <Route path='/createchallenge' element={<CreateChallenge/>}/>
            <Route path='/onlineusersmodal' element={<OnlineUsersModal/>}/>      
            <Route path='/usersearchlogic' element={<UserSearchLogic/>}/>
            <Route path='/tournamentscarousel' element={<TournamentsCarousel/>}/>
            <Route path='/publicchatmodal' element={<PublicChatModal/>}/>
            <Route path='/chatwindow/:id' element={<ChatWindow/>}/>
            <Route path='/myzone' element={<MyZone/>}/>
            <Route path='/privatechat/:userId?' element={<PrivateChat/>}/>
            <Route path='/stkpushform' element={<StkPushForm/>}/>
            <Route path='/admintournamentspage' element={<AdminTournamentsPage/>}/>
            <Route path='/tournamentdetails/:id' element={<TournamentDetails/>}/>
            <Route path='/edittournamentpage/:id' element={<EditTournamentPage/>}/>
            <Route path='/addtournamentpage' element={<AddTournamentPage/>}/>
            <Route path='/account' element={<Account/>}/>
            <Route path='/topnavbar' element={<TopNavbar/>}/>
            <Route path='/sidenavbar' element={<SideNavbar/>}/>
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path='/mainlayout' element={<MainLayout/>}/>
            <Route path='/howitworks' element={<HowItWorks/>}/>
            <Route path='/about' element={<About/>}/>
            <Route path='/help' element={<Help/>}/>
            <Route path='/supportpage' element={<SupportPage/>}/>
            <Route path='/privacypolicy' element={<PrivacyPolicy/>}/>
            <Route path='/termsofuse' element={<TermsOfUse/>}/>
            <Route path='/customnavbar' element={<CustomNavbar/>}/>
            <Route path='/responsiblegaming' element={<ResponsibleGaming/>}/>
            <Route path='/signup' element={<Signup/>}/>
            <Route path='/login' element={<Login/>}/>
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </div>
  );
}
export default App;
