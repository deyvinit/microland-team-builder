# Application & Database Architecture Diagram (Team Builder)

## 1. Application Architecture (Hybrid Mobile App)

This diagram illustrates the separation between the native device shell and the React-powered web view, showing where key features reside.

```mermaid
graph TD
    subgraph "Native Shell (Capacitor)"
        A[Biometric Login Plugin]
        B[Device FileSystem/Storage Plugin]
        C[Microphone/Voice Input Plugin]
    end

    subgraph "Web Layer (React WebView)"
        D[UI Framework: Light/Dark Theme]
        E[Chat Interface & Interactions]
        F[AI Concierge Module]
        G[Offline Cache Manager]
    end

    subgraph "Backend / AI Services"
        H[LLM / Agentic AI Service]
        I[Database Engine]
    end

    %% Interactions
    A -.-> D
    C -.-> E
    B <--> G
    F <--> H
    G <--> I
    E <--> F
```

## 2. Database Schema

Tables structured to match users' skills and availability with project goals.

```mermaid
erDiagram
    PROFILES {
        string id PK
        string name
        string skills "List of technical & soft skills"
        string availability "Time commitment / Role"
    }
    PROJECTS {
        string id PK
        string title
        string description
        string required_skills
    }
    MATCHES {
        string id PK
        string profile_id FK
        string project_id FK
        string status "Pending, Approved, Rejected"
        string ai_reasoning "Explanation of why this match works"
        string drafted_message "Intro message drafted by AI"
    }

    PROFILES ||--o{ MATCHES : "candidate for"
    PROJECTS ||--o{ MATCHES : "requires"
```

## 3. Agentic AI Workflow Diagram

The specific workflow flow showing the explicit human approval gate.

```mermaid
sequenceDiagram
    participant User
    participant Chat UI
    participant AI Concierge
    participant Database

    User->>Chat UI: "Build my fintech team" (Voice/Text)
    Chat UI->>AI Concierge: Request Goal Execution
    AI Concierge->>Database: Query appropriate skills/profiles
    Database-->>AI Concierge: Return Candidates
    AI Concierge->>AI Concierge: Generate Match Reasoning & Draft Messages
    AI Concierge-->>Chat UI: Present Candidates, Reasoning, and Drafts
    Chat UI-->>User: **[Approval Gate]** Explain "Why" & Request Action
    
    alt User Approves
        User->>Chat UI: Click "Approve & Send"
        Chat UI->>AI Concierge: Confirm Action
        AI Concierge->>Database: Commit Matches & Send Messages
        AI Concierge-->>User: Action Completed
    else User Rejects/Modifies
        User->>Chat UI: Edit Draft / Reject Match
        Chat UI->>AI Concierge: Regenerate / Cancel
    end
```
