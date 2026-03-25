MATCH (n)
DETACH DELETE n;

CREATE CONSTRAINT team_name IF NOT EXISTS
FOR (t:Team)
REQUIRE t.name IS UNIQUE;

CREATE CONSTRAINT person_email IF NOT EXISTS
FOR (p:Person)
REQUIRE p.email IS UNIQUE;

CREATE CONSTRAINT project_code IF NOT EXISTS
FOR (p:Project)
REQUIRE p.code IS UNIQUE;

CREATE CONSTRAINT task_id IF NOT EXISTS
FOR (t:Task)
REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT dashboard_name IF NOT EXISTS
FOR (d:Dashboard)
REQUIRE d.name IS UNIQUE;

CREATE CONSTRAINT metric_name IF NOT EXISTS
FOR (m:Metric)
REQUIRE m.name IS UNIQUE;

MERGE (platform:Team {name: 'Platform'})
SET platform.headcount = 2,
    platform.region = 'Jakarta';

MERGE (analytics:Team {name: 'Analytics'})
SET analytics.headcount = 2,
    analytics.region = 'Bandung';

MERGE (andi:Person {email: 'andi@demo.local'})
SET andi.name = 'Andi',
    andi.role = 'Data Engineer',
    andi.level = 'Senior';

MERGE (bela:Person {email: 'bela@demo.local'})
SET bela.name = 'Bela',
    bela.role = 'Backend Engineer',
    bela.level = 'Mid';

MERGE (citra:Person {email: 'citra@demo.local'})
SET citra.name = 'Citra',
    citra.role = 'BI Analyst',
    citra.level = 'Senior';

MERGE (dimas:Person {email: 'dimas@demo.local'})
SET dimas.name = 'Dimas',
    dimas.role = 'Product Manager',
    dimas.level = 'Lead';

MERGE (neoDash:Project {code: 'NEO-DASH'})
SET neoDash.name = 'Neo4j Dashboard',
    neoDash.status = 'active',
    neoDash.priority = 'high',
    neoDash.budget = 24000;

MERGE (sales360:Project {code: 'SALES-360'})
SET sales360.name = 'Sales 360',
    sales360.status = 'active',
    sales360.priority = 'medium',
    sales360.budget = 18000;

MERGE (riskWatch:Project {code: 'RISK-WATCH'})
SET riskWatch.name = 'Risk Watch',
    riskWatch.status = 'planning',
    riskWatch.priority = 'high',
    riskWatch.budget = 12000;

MERGE (execDash:Dashboard {name: 'Executive Overview'})
SET execDash.refreshMinutes = 15,
    execDash.audience = 'executive';

MERGE (opsDash:Dashboard {name: 'Operations Live'})
SET opsDash.refreshMinutes = 5,
    opsDash.audience = 'ops';

MERGE (metricProjects:Metric {name: 'Active Projects'})
SET metricProjects.value = 2,
    metricProjects.unit = 'count';

MERGE (metricTasks:Metric {name: 'Open Tasks'})
SET metricTasks.value = 4,
    metricTasks.unit = 'count';

MERGE (metricBudget:Metric {name: 'Budget At Risk'})
SET metricBudget.value = 12000,
    metricBudget.unit = 'usd';

MERGE (metricCoverage:Metric {name: 'Dashboard Coverage'})
SET metricCoverage.value = 67,
    metricCoverage.unit = 'percent';

MERGE (task1:Task {id: 'TASK-101'})
SET task1.title = 'Model graph schema',
    task1.status = 'done',
    task1.priority = 'high',
    task1.storyPoints = 5;

MERGE (task2:Task {id: 'TASK-102'})
SET task2.title = 'Build API aggregation',
    task2.status = 'doing',
    task2.priority = 'high',
    task2.storyPoints = 8;

MERGE (task3:Task {id: 'TASK-103'})
SET task3.title = 'Create executive widgets',
    task3.status = 'todo',
    task3.priority = 'medium',
    task3.storyPoints = 3;

MERGE (task4:Task {id: 'TASK-201'})
SET task4.title = 'Integrate CRM feed',
    task4.status = 'done',
    task4.priority = 'medium',
    task4.storyPoints = 5;

MERGE (task5:Task {id: 'TASK-202'})
SET task5.title = 'Clean region mapping',
    task5.status = 'doing',
    task5.priority = 'low',
    task5.storyPoints = 2;

MERGE (task6:Task {id: 'TASK-301'})
SET task6.title = 'Define fraud thresholds',
    task6.status = 'todo',
    task6.priority = 'high',
    task6.storyPoints = 8;

MATCH (platform:Team {name: 'Platform'})
MATCH (analytics:Team {name: 'Analytics'})
MATCH (andi:Person {email: 'andi@demo.local'})
MATCH (bela:Person {email: 'bela@demo.local'})
MATCH (citra:Person {email: 'citra@demo.local'})
MATCH (dimas:Person {email: 'dimas@demo.local'})
MATCH (neoDash:Project {code: 'NEO-DASH'})
MATCH (sales360:Project {code: 'SALES-360'})
MATCH (riskWatch:Project {code: 'RISK-WATCH'})
MATCH (execDash:Dashboard {name: 'Executive Overview'})
MATCH (opsDash:Dashboard {name: 'Operations Live'})
MATCH (metricProjects:Metric {name: 'Active Projects'})
MATCH (metricTasks:Metric {name: 'Open Tasks'})
MATCH (metricBudget:Metric {name: 'Budget At Risk'})
MATCH (metricCoverage:Metric {name: 'Dashboard Coverage'})
MATCH (task1:Task {id: 'TASK-101'})
MATCH (task2:Task {id: 'TASK-102'})
MATCH (task3:Task {id: 'TASK-103'})
MATCH (task4:Task {id: 'TASK-201'})
MATCH (task5:Task {id: 'TASK-202'})
MATCH (task6:Task {id: 'TASK-301'})
MERGE (andi)-[:MEMBER_OF]->(platform)
MERGE (bela)-[:MEMBER_OF]->(platform)
MERGE (citra)-[:MEMBER_OF]->(analytics)
MERGE (dimas)-[:MEMBER_OF]->(analytics)
MERGE (platform)-[:OWNS]->(neoDash)
MERGE (analytics)-[:OWNS]->(sales360)
MERGE (analytics)-[:OWNS]->(riskWatch)
MERGE (dimas)-[:LEADS]->(neoDash)
MERGE (citra)-[:LEADS]->(sales360)
MERGE (dimas)-[:LEADS]->(riskWatch)
MERGE (neoDash)-[:HAS_TASK]->(task1)
MERGE (neoDash)-[:HAS_TASK]->(task2)
MERGE (neoDash)-[:HAS_TASK]->(task3)
MERGE (sales360)-[:HAS_TASK]->(task4)
MERGE (sales360)-[:HAS_TASK]->(task5)
MERGE (riskWatch)-[:HAS_TASK]->(task6)
MERGE (andi)-[:ASSIGNED_TO]->(task1)
MERGE (bela)-[:ASSIGNED_TO]->(task2)
MERGE (citra)-[:ASSIGNED_TO]->(task3)
MERGE (citra)-[:ASSIGNED_TO]->(task4)
MERGE (andi)-[:ASSIGNED_TO]->(task5)
MERGE (dimas)-[:ASSIGNED_TO]->(task6)
MERGE (neoDash)-[:USES_DASHBOARD]->(opsDash)
MERGE (sales360)-[:USES_DASHBOARD]->(execDash)
MERGE (riskWatch)-[:USES_DASHBOARD]->(execDash)
MERGE (execDash)-[:TRACKS]->(metricProjects)
MERGE (execDash)-[:TRACKS]->(metricBudget)
MERGE (opsDash)-[:TRACKS]->(metricTasks)
MERGE (opsDash)-[:TRACKS]->(metricCoverage)
RETURN 'sample data loaded' AS status;
