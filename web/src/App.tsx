import { Link, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import { Faq, Find, Mine, TrainingsLayout, Verify } from "./pages/Trainings";
import SessionDetail from "./pages/SessionDetail";
import Platform, { PlatformEnter } from "./pages/Platform";
import { About, Account, Login, News } from "./pages/Misc";
import { AdminIndex, AdminLayout, Complete, Courses, Dash, Invites, Lecturers, Nominate, Review, Roll, Teach } from "./pages/admin/Admin";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="trainings" element={<TrainingsLayout />}>
          <Route index element={<Find />} />
          <Route path="mine" element={<Mine />} />
          <Route path="verify" element={<Verify />} />
          <Route path="faq" element={<Faq />} />
        </Route>
        <Route path="trainings/:id" element={<SessionDetail />} />
        <Route path="platform" element={<Platform />} />
        <Route path="platform/enter" element={<PlatformEnter />} />
        <Route path="news" element={<News />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="account" element={<Account />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminIndex />} />
          <Route path="teach" element={<Teach />} />
          <Route path="roll" element={<Roll />} />
          <Route path="roll/:sid" element={<Roll />} />
          <Route path="nominate" element={<Nominate />} />
          <Route path="dash" element={<Dash />} />
          <Route path="review" element={<Review />} />
          <Route path="invites" element={<Invites />} />
          <Route path="complete" element={<Complete />} />
          <Route path="lecturers" element={<Lecturers />} />
          <Route path="courses" element={<Courses />} />
        </Route>
        <Route path="*" element={<div className="wrap narrow"><h1 className="h2">找不到這個頁面</h1><Link to="/" className="btn btn-p">回到首頁</Link></div>} />
      </Route>
    </Routes>
  );
}
