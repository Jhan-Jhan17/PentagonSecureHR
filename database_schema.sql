--
-- PostgreSQL database dump
--

\restrict NTrlwPZsm9JZcvUC1O0c4Hy7VBON0JJcK6hgCS0NHPBAwv7314XFmDGr7xa1DuA

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.applications (
    id integer NOT NULL,
    applicant_name character varying,
    role_applied character varying,
    contact_email character varying,
    resume_filename character varying,
    resume_data text,
    status character varying,
    applied_date character varying
);
ALTER TABLE public.applications OWNER TO postgres;
CREATE SEQUENCE public.applications_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.applications_id_seq OWNER TO postgres;
ALTER SEQUENCE public.applications_id_seq OWNED BY public.applications.id;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.attendance (
    log_id integer NOT NULL,
    user_id character varying NOT NULL,
    "timestamp" character varying NOT NULL,
    location character varying,
    status character varying
);
ALTER TABLE public.attendance OWNER TO postgres;
CREATE SEQUENCE public.attendance_log_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.attendance_log_id_seq OWNER TO postgres;
ALTER SEQUENCE public.attendance_log_id_seq OWNED BY public.attendance.log_id;

-- [FEATURE 2] ADDED AUDIT LOGS TABLE
--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.audit_logs (
    audit_id integer NOT NULL,
    admin_id character varying NOT NULL,
    action_type character varying NOT NULL,
    target_user_id character varying NOT NULL,
    old_value text,
    new_value text,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.audit_logs OWNER TO postgres;
CREATE SEQUENCE public.audit_logs_audit_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.audit_logs_audit_id_seq OWNER TO postgres;
ALTER SEQUENCE public.audit_logs_audit_id_seq OWNED BY public.audit_logs.audit_id;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.documents (
    id integer NOT NULL,
    user_id character varying,
    doc_type character varying,
    filename character varying,
    status character varying
);
ALTER TABLE public.documents OWNER TO postgres;
CREATE SEQUENCE public.documents_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;
ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;

--
-- Name: emergency_contacts; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.emergency_contacts (
    user_id character varying NOT NULL,
    contact_name character varying,
    contact_phone character varying
);
ALTER TABLE public.emergency_contacts OWNER TO postgres;

--
-- Name: leaves; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.leaves (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    type character varying NOT NULL,
    days integer NOT NULL,
    status character varying
);
ALTER TABLE public.leaves OWNER TO postgres;
CREATE SEQUENCE public.leaves_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.leaves_id_seq OWNER TO postgres;
ALTER SEQUENCE public.leaves_id_seq OWNED BY public.leaves.id;

--
-- Name: overtime; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.overtime (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    date character varying NOT NULL,
    hours integer NOT NULL,
    reason character varying NOT NULL,
    status character varying
);
ALTER TABLE public.overtime OWNER TO postgres;
CREATE SEQUENCE public.overtime_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.overtime_id_seq OWNER TO postgres;
ALTER SEQUENCE public.overtime_id_seq OWNED BY public.overtime.id;

--
-- Name: payroll_runs; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.payroll_runs (
    id integer NOT NULL,
    run_date character varying NOT NULL,
    total_amount double precision NOT NULL,
    status character varying,
    processed_by character varying NOT NULL
);
ALTER TABLE public.payroll_runs OWNER TO postgres;
CREATE SEQUENCE public.payroll_runs_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.payroll_runs_id_seq OWNER TO postgres;
ALTER SEQUENCE public.payroll_runs_id_seq OWNED BY public.payroll_runs.id;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    type character varying,
    details text,
    status character varying,
    created_at timestamp without time zone
);
ALTER TABLE public.support_tickets OWNER TO postgres;
CREATE SEQUENCE public.support_tickets_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.support_tickets_id_seq OWNER TO postgres;
ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.users (
    id character varying NOT NULL,
    password character varying NOT NULL,
    name character varying NOT NULL,
    role character varying NOT NULL,
    department character varying,
    "position" character varying,
    basic_pay double precision
);
ALTER TABLE public.users OWNER TO postgres;


-- ALTERS & SEQUENCES
ALTER TABLE ONLY public.applications ALTER COLUMN id SET DEFAULT nextval('public.applications_id_seq'::regclass);
ALTER TABLE ONLY public.attendance ALTER COLUMN log_id SET DEFAULT nextval('public.attendance_log_id_seq'::regclass);
ALTER TABLE ONLY public.audit_logs ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_logs_audit_id_seq'::regclass);
ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);
ALTER TABLE ONLY public.leaves ALTER COLUMN id SET DEFAULT nextval('public.leaves_id_seq'::regclass);
ALTER TABLE ONLY public.overtime ALTER COLUMN id SET DEFAULT nextval('public.overtime_id_seq'::regclass);
ALTER TABLE ONLY public.payroll_runs ALTER COLUMN id SET DEFAULT nextval('public.payroll_runs_id_seq'::regclass);
ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);

-- DATA INSERTS (Empty arrays ignored for brevity, keeping your seeded data)
COPY public.leaves (id, user_id, type, days, status) FROM stdin;
34      EMP-01  Sick Leave (SL) 3       Approved
1       EMP-01  Sick Leave (SL) 1       Approved
\.

COPY public.users (id, password, name, role, department, "position", basic_pay) FROM stdin;
ADMIN-01        admin123        System Admin    admin   Human Resources HR Director        65000
EMP-01  emp123  First Employee  employee        Development     Software Engineer  48500
\.

SELECT pg_catalog.setval('public.leaves_id_seq', 34, true);

-- CONSTRAINTS
ALTER TABLE ONLY public.applications ADD CONSTRAINT applications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (log_id);
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.emergency_contacts ADD CONSTRAINT emergency_contacts_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.leaves ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.overtime ADD CONSTRAINT overtime_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payroll_runs ADD CONSTRAINT payroll_runs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.support_tickets ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- FOREIGN KEYS
ALTER TABLE ONLY public.attendance ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.leaves ADD CONSTRAINT leaves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

\unrestrict NTrlwPZsm9JZcvUC1O0c4Hy7VBON0JJcK6hgCS0NHPBAwv7314XFmDGr7xa1DuA