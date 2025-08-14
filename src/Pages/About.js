import React from 'react';
import { Users, Target, Info, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import 'bootstrap/dist/css/bootstrap.min.css';

const About = () => {
  return (
    <div className="privacy-policy-container">
      {/* Page Header */}
      <motion.div
        className="text-center mb-5"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>About NoctaZone</h1>
        <p className="lead">
          Where Gamers Connect, Compete, and Win.
        </p>
      </motion.div>

      {/* Mission + Vision */}
      <div className="row align-items-start mb-5">
        <motion.div
          className="col-md-6 mb-4"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <h2>
            <Target className="me-2" /> Our Mission
          </h2>
          <p>
            NoctaZone exists to elevate the gaming experience. Whether you're a casual
            player or a competitive warrior, our platform is designed to help you find matches,
            enter tournaments, and grow your reputation in the gaming world.
          </p>
        </motion.div>

        <motion.div
          className="col-md-6"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <h2>
            <Eye className="me-2" /> Our Vision
          </h2>
          <p>
            To become the leading digital battlefield where gamers worldwide unite to showcase
            their skills, build lasting communities, and redefine competitive play through
            fairness, innovation, and shared passion.
          </p>
        </motion.div>
      </div>
      {/* Features */}
      <div className="row text-center mb-5">
        {[
          {
            icon: <Users size={40} className="mb-3 text-primary" />,
            title: "Community-Driven",
            text: "Built for and by gamers. We listen, improve, and evolve based on your feedback."
          },
          {
            icon: <Target size={40} className="mb-3 text-success" />,
            title: "Competitive Play",
            text: "Join ranked battles, earn rewards, and build your NoctaZone legacy."
          },
          {
            icon: <Info size={40} className="mb-3 text-danger" />,
            title: "Fair & Transparent",
            text: "We prioritize integrity, security, and fairness in every match and transaction."
          }
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            className="col-md-4 mb-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.2, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="p-4 border rounded h-100 shadow-sm bg-dark text-light">
              {feature.icon}
              <h5 className="fw-bold">{feature.title}</h5>
              <p>{feature.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {/* CTA */}
      <motion.div
        className="text-center bg-dark text-white p-5 rounded"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <h2 className="fw-bold mb-3">Ready to Level Up?</h2>
        <p className="mb-4">Join NoctaZone today and dominate the leaderboard!</p>
        <a href="/signup" className="btn btn-primary btn-lg px-4">
          Get Started
        </a>
      </motion.div>
    </div>
  );
};

export default About;