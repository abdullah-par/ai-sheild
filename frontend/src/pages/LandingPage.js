import React from 'react';
import { motion } from 'framer-motion';
import './LandingPage.css';

/* ── UI Components ─────────────────────────── */

const FeatureIcon = ({ type }) => {
  const strokeColor = "var(--accent-primary)";
  if (type === 'ai') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>
    </svg>
  );
  if (type === 'realtime') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m13 2-2 10h3L11 22l2-10h-3l2-10z"/>
    </svg>
  );
  if (type === 'secure') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
  if (type === 'encryption') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
  if (type === 'compliance') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
  if (type === 'privacy') return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 12v10"/>
    </svg>
  );
  return null;
};

/* ── Animation Variants ────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

/* ── Landing Page ───────────────────────────── */

const LandingPage = ({ onNavigate }) => {
  return (
    <div className="landing-2">
      {/* ── HERO ── */}
      <section className="hero-2">
        <div className="hero-grid active" />
        <div className="hero-glow" />
        
        <motion.div 
          className="hero-container-2"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="hero-content-left">
            <motion.h1 className="hero-title-2" variants={itemVariants}>
              Digital Forensic<br/>
              <span className="text-gradient">Intelligence</span>
            </motion.h1>
            
            <motion.p className="hero-subtitle-2" variants={itemVariants}>
              AI.SHIELD is an elite forensic toolkit designed for security professionals. 
              Identify, analyze, and neutralize advanced digital threats with sub-second intelligence.
            </motion.p>

            <motion.div className="hero-actions-2" variants={itemVariants}>
              <motion.button 
                className="btn-primary" 
                onClick={() => onNavigate('scan')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Analysis
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </motion.button>
              <motion.button 
                className="btn-secondary" 
                onClick={() => onNavigate('dashboard')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Threat Feed
              </motion.button>
            </motion.div>
          </div>

          <motion.div className="hero-bento-right" variants={itemVariants}>
            <div className="bento-card bento-feature">
              <FeatureIcon type="ai" />
              <div className="bento-lab">Phishing ML Model</div>
            </div>
            <div className="bento-card bento-stego">
              <FeatureIcon type="secure" />
              <div className="bento-lab">Steganography Engine</div>
            </div>
            <div className="bento-card bento-stat">
              <div className="bento-val">99.9%</div>
              <div className="bento-lab">Detection Accuracy</div>
            </div>
            <div className="bento-card bento-latency">
              <div className="bento-val">&lt;0.5s</div>
              <div className="bento-lab">Analysis Latency</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── CORE CAPABILITIES (FEATURES) ── */}
      <section className="features-grid-section" id="features">
        <div className="features-container">
          <motion.div 
            className="features-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariants}
          >
            <div className="feat-label">PLATFORM STACK</div>
            <h2 className="feat-title">Machine Learning Detection Engines</h2>
            <p className="feat-subtitle">Three specialized models working in tandem for comprehensive threat detection.</p>
          </motion.div>
          
          <motion.div 
            className="features-grid-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {[
              { icon: 'ai', title: 'Phishing ML Model', desc: 'Trained on millions of URLs and emails. Analyzes domain reputation, SSL validity, geolocation, redirect chains, and typosquatting patterns to classify threats with 95%+ accuracy.' },
              { icon: 'secure', title: 'Steganography Detector', desc: 'LSB-based anomaly detection using chi-square statistical testing. Identifies hidden encrypted payloads in images through entropy analysis and pixel-level pattern recognition.' },
              { icon: '⚡', title: 'Sub-Second Latency', desc: 'Get real-time threat intelligence in under 500ms. Asynchronous processing enables blazing-fast analysis of multiple threat vectors simultaneously.' },
              { icon: '📂', title: 'Unified Detection Platform', desc: 'Single interface for URL scanning, email forensics, and image steganography analysis. All engines share real-time threat intelligence data.' },
              { icon: '🔒', title: 'Heuristic & ML Hybrid', desc: 'Combines traditional heuristic rules with modern machine learning. When models disagree with heuristics, we use weighted ensemble approach for maximum confidence.' },
              { icon: '📈', title: 'Detailed Forensic Reports', desc: 'Complete breakdown of risk scores, confidence percentages, indicators, and actionable recommendations for incident response teams and security analysts.' },
            ].map((feat, i) => (
              <motion.div 
                className="feat-card-2" 
                key={i} 
                variants={itemVariants}
                whileHover={{ y: -10, borderColor: 'var(--accent-primary)', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.1)' }}
              >
                <div className="feat-icon-2">
                  {typeof feat.icon === 'string' && feat.icon.length > 2 ? <FeatureIcon type={feat.icon} /> : feat.icon}
                </div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PHISHING DEEP DIVE ── */}
      <section className="deep-dive-section phishing-dive">
        <div className="deep-dive-container">
          <motion.div 
            className="dive-visual"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="visual-box">
              <div className="scan-line-horizontal" />
              <div className="code-snippet">
                <code>VERDICT: PHISHING</code><br/>
                <code>Risk Score: 78.5%</code><br/>
                <code>Confidence: 92.3%</code>
              </div>
            </div>
          </motion.div>
          <motion.div 
            className="dive-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.div className="dive-label" variants={itemVariants}>PHISHING ML ENGINE</motion.div>
            <motion.h2 className="dive-title" variants={itemVariants}>Intelligent URL & Email Analysis.</motion.h2>
            <motion.p className="dive-text" variants={itemVariants}>
              Our phishing model analyzes multiple threat indicators in parallel. Domain reputation, SSL certificate validity, geolocation patterns, redirect chains, and keyword analysis combine to produce a risk score and confidence metric.
            </motion.p>
            <div className="dive-features">
              {[
                { title: 'Domain Reputation', desc: 'Analyzing domain age (new registrations are risky), SSL certificate validity, IP geolocation, and registrar reputation to identify fresh-set phishing infrastructure.' },
                { title: 'Heuristic Pattern Matching', desc: 'Detecting suspicious keywords (paypal, verify, update, urgent), risky TLDs (.ru, .cc, .xyz), and typosquatting attempts that mimic legitimate brands.' },
                { title: 'ML Classification', desc: 'Our trained classifier uses URL features extracted by vectorization. When available, predictions are weighted heavily in the final risk assessment. Confidence scores reflect both model and heuristic agreement.' }
              ].map((feat, i) => (
                <motion.div className="dive-feat" key={i} variants={itemVariants}>
                  <h4>{feat.title}</h4>
                  <p>{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STEGANOGRAPHY DEEP DIVE ── */}
      <section className="deep-dive-section stego-dive">
        <div className="deep-dive-container inverse">
          <motion.div 
            className="dive-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.div className="dive-label" variants={itemVariants}>STEGANOGRAPHY ENGINE</motion.div>
            <motion.h2 className="dive-title" variants={itemVariants}>Detecting Hidden Payloads.</motion.h2>
            <motion.p className="dive-text" variants={itemVariants}>
              Steganography hides encrypted data in innocent-looking images. Our statistical analysis detects anomalies that betray hidden data, even in high-quality images.
            </motion.p>
            <div className="dive-features">
              {[
                { title: 'LSB Anomaly Detection', desc: 'Least Significant Bit analysis identifies unnatural patterns in the lowest pixel value bits where data is typically concealed. We measure the chi-square distance from randomness.' },
                { title: 'Entropy Mapping', desc: 'High entropy blocks indicate encrypted payloads. We calculate Shannon entropy across the image to visualize where hidden data clusters are most concentrated.' },
                { title: 'Metadata & Format Validation', desc: 'EXIF anomalies and unusual file characteristics indicate tampering. We verify image format integrity and flag suspicious metadata injection patterns.' }
              ].map((feat, i) => (
                <motion.div className="dive-feat" key={i} variants={itemVariants}>
                  <h4>{feat.title}</h4>
                  <p>{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div 
            className="dive-visual"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="visual-box stego-box">
              <div className="pixel-grid" />
              <motion.div 
                className="stego-overlay"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 1 }}
              >
                <motion.span
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
                >
                  PAYLOAD DETECTED
                </motion.span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="how-container">
          <motion.div 
            className="how-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariants}
          >
            <h2 className="how-title">The Forensic Process</h2>
            <p className="how-subtitle">Three steps to actionable threat intelligence.</p>
          </motion.div>
          <motion.div 
            className="how-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {[
              { num: '01', title: 'Submit Evidence', desc: 'Upload an image for steganography analysis, paste raw email headers, or enter a URL for phishing detection.' },
              { num: '02', title: 'Model Processing', desc: 'Our specialized ML models and heuristic engines analyze the data in parallel. Phishing model extracts domain features and classifies threat level. Stego model performs LSB and entropy analysis.' },
              { num: '03', title: 'Forensic Report', desc: 'Receive verdict, risk score, confidence percentage, and detailed indicators. Get actionable recommendations and full breakdown of why a threat was flagged.' }
            ].map((step, i) => (
              <motion.div 
                className="how-step" 
                key={i} 
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECURITY & COMPLIANCE ── */}
      <section className="security-section" id="security">
        <div className="security-container">
          <motion.div 
            className="security-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariants}
          >
            <div className="sec-label">DATA INTEGRITY</div>
            <h2 className="sec-title">Enterprise-Grade Security</h2>
            <p className="sec-subtitle">We maintain the highest standards of data protection and forensic integrity.</p>
          </motion.div>
          <motion.div 
            className="security-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {[
              { icon: 'secure', title: 'End-to-End Encryption', desc: 'All data submissions and results are protected using AES-256 encryption in transit and at rest.' },
              { icon: 'compliance', title: 'SOC2 Compliance', desc: 'Our infrastructure follows strict SOC2 Type II protocols for security, availability, and confidentiality.' },
              { icon: 'privacy', title: 'Zero-Knowledge Privacy', desc: 'We do not store the content of your scans. Metadata is anonymized for global threat intelligence.' }
            ].map((sec, i) => (
              <motion.div 
                className="sec-card" 
                key={i} 
                variants={itemVariants}
                whileHover={{ y: -10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
              >
                <div className="sec-icon"><FeatureIcon type={sec.icon} /></div>
                <h4>{sec.title}</h4>
                <p>{sec.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── RESOURCE HUB ── */}
      <section className="resources-section" id="resources">
        <div className="resources-container">
          <motion.div 
            className="res-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUpVariants}
          >
            <h2 className="res-title">Knowledge & Integration</h2>
            <p className="res-subtitle">Tools and documentation for security teams and developers.</p>
          </motion.div>
          <motion.div 
            className="res-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {[
              { label: 'DEVELOPERS', title: 'REST API v2.0', desc: 'Integrate AI.SHIELD into your SOC workflow. Complete endpoints for URL and File analysis.', link: 'View Documentation' },
              { label: 'DATASET', title: 'Live Threat Feed', desc: 'Access our global database of identified phishing domains and steganography signatures.', link: 'Access Database' },
              { label: 'RESEARCH', title: 'Forensic Blog', desc: 'Deep dives into the latest cyber threats and our team\'s forensic methodology.', link: 'Read Latest Post' }
            ].map((res, i) => (
              <motion.div 
                className="res-item" 
                key={i} 
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className="res-label">{res.label}</div>
                <h3>{res.title}</h3>
                <p>{res.desc}</p>
                <button className="res-link">{res.link} →</button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-section-2">
        <motion.div 
          className="stats-container-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          {[
            { val: '28.4M', lab: 'Threats Neutralized' },
            { val: '99.9%', lab: 'Detection Accuracy' },
            { val: '< 0.5s', lab: 'Response Latency' }
          ].map((stat, i) => (
            <motion.div 
              className="stat-item-2" 
              key={i} 
              variants={itemVariants}
              whileHover={{ scale: 1.1 }}
            >
              <div className="stat-val-2">{stat.val}</div>
              <div className="stat-lab-2">{stat.lab}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

    </div>
  );
};

export default LandingPage;
