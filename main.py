from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, timedelta
import sqlite3, os, hashlib, hmac, secrets, json, uuid, jwt, shutil, urllib.request, urllib.error

BASE=os.path.dirname(__file__); DB=os.path.join(BASE,'nyaychain.db'); UP=os.path.join(BASE,'uploads')
os.makedirs(UP,exist_ok=True)
SECRET='nyaychain-demo-secret-change-me'
ROLES=['citizen','police','lawyer','judge','admin']
FABRIC_ENABLED=os.getenv('FABRIC_ENABLED','false').lower()=='true'
FABRIC_SERVICE_URL=os.getenv('FABRIC_SERVICE_URL','http://127.0.0.1:8081')
app=FastAPI(title='NyayChain SIH Prototype')
app.mount('/static',StaticFiles(directory=os.path.join(BASE,'static')),name='static')
templates=Jinja2Templates(directory=os.path.join(BASE,'templates'))

# ---------- password hashing (pure-stdlib PBKDF2, avoids native bcrypt build/version issues) ----------
def hash_password(pw:str)->str:
    salt=secrets.token_hex(16)
    dk=hashlib.pbkdf2_hmac('sha256',pw.encode(),bytes.fromhex(salt),200_000).hex()
    return f'pbkdf2${salt}${dk}'
def verify_password(pw:str,stored:str)->bool:
    try:
        scheme,salt,dk=stored.split('$')
        if scheme!='pbkdf2':return False
        check=hashlib.pbkdf2_hmac('sha256',pw.encode(),bytes.fromhex(salt),200_000).hex()
        return hmac.compare_digest(check,dk)
    except Exception:
        return False

# ---------- db ----------
def db():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def col_exists(c,table,col):
    return any(r['name']==col for r in c.execute(f'PRAGMA table_info({table})'))

def init():
    c=db()
    c.executescript('''
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE,password TEXT,role TEXT,name TEXT);
    CREATE TABLE IF NOT EXISTS cases(id INTEGER PRIMARY KEY AUTOINCREMENT,case_id TEXT UNIQUE,fir_no TEXT,title TEXT,case_type TEXT,complainant TEXT,officer TEXT,lawyer TEXT,court TEXT,status TEXT,created_at TEXT,updated_at TEXT);
    CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY AUTOINCREMENT,doc_id TEXT UNIQUE,case_id TEXT,name TEXT,doc_type TEXT,uploaded_by TEXT,uploaded_at TEXT,sha256 TEXT,path TEXT,version INTEGER DEFAULT 1,access_level TEXT,watermark TEXT);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,ts TEXT,user_email TEXT,role TEXT,action TEXT,case_id TEXT,doc_id TEXT,ip TEXT,result TEXT,hash TEXT);
    CREATE TABLE IF NOT EXISTS blocks(id INTEGER PRIMARY KEY AUTOINCREMENT,block_index INTEGER,ts TEXT,case_id TEXT,doc_id TEXT,event TEXT,user_email TEXT,previous_hash TEXT,current_hash TEXT);
    CREATE TABLE IF NOT EXISTS approvals(id INTEGER PRIMARY KEY AUTOINCREMENT,request_id TEXT,case_id TEXT,action TEXT,requested_by TEXT,approver TEXT,status TEXT,created_at TEXT);
    CREATE TABLE IF NOT EXISTS security_events(id INTEGER PRIMARY KEY AUTOINCREMENT,ts TEXT,event TEXT,severity TEXT,details TEXT);
    ''')
    if not col_exists(c,'cases','remarks'):
        c.execute('ALTER TABLE cases ADD COLUMN remarks TEXT DEFAULT ""')
    users=[('citizen@demo.com','Citizen','citizen','Demo Citizen'),
           ('police@demo.com','Police123','police','Demo Investigating Officer'),
           ('lawyer@demo.com','Lawyer123','lawyer','Demo Lawyer'),
           ('judge@demo.com','Judge123','judge','Demo Judge'),
           ('admin@demo.com','Admin123','admin','System Administrator')]
    for e,p,r,n in users:
        try:c.execute('INSERT INTO users(email,password,role,name) VALUES(?,?,?,?)',(e,hash_password(p),r,n))
        except:pass
    if c.execute('SELECT COUNT(*) n FROM cases').fetchone()['n']==0:
        now=datetime.now().isoformat(timespec='seconds')
        rows=[('NYC-2026-0001','FIR-KA-2026-00124','Online Financial Fraud','Criminal','Demo Citizen','Demo Investigating Officer','Demo Lawyer','Demo District Court','Investigation',now,now),
              ('NYC-2026-0002','FIR-KA-2026-00125','Property Dispute','Civil','Asha Rao','Demo Investigating Officer','Demo Lawyer','Demo District Court','Trial',now,now),
              ('NYC-2026-0003','FIR-KA-2026-00126','Theft Investigation','Criminal','Rahul Kumar','Demo Investigating Officer','Demo Lawyer','Demo District Court','Charge Sheet',now,now),
              ('NYC-2026-0004','FIR-KA-2026-00127','Online Fraud','Criminal','Meera Shah','Demo Investigating Officer','Demo Lawyer','Demo District Court','Evidence Collection',now,now),
              ('NYC-2026-0005','PET-KA-2026-00019','Civil Petition','Civil','Kiran Patel','Demo Investigating Officer','Demo Lawyer','Demo District Court','Judgment',now,now)]
        c.executemany('INSERT INTO cases(case_id,fir_no,title,case_type,complainant,officer,lawyer,court,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',rows)
    c.commit(); c.close()
init()

def token(user):return jwt.encode({'email':user['email'],'role':user['role'],'exp':datetime.utcnow()+timedelta(hours=8)},SECRET,algorithm='HS256')
def user_from(req):
    t=req.cookies.get('token')
    if not t: return None
    try:
        p=jwt.decode(t,SECRET,algorithms=['HS256']); c=db(); u=c.execute('SELECT * FROM users WHERE email=?',(p['email'],)).fetchone(); c.close(); return u
    except Exception:return None

def audit(u,action,case_id='',doc_id='',result='SUCCESS',ip='127.0.0.1'):
    now=datetime.now().isoformat(timespec='seconds'); h=hashlib.sha256(f'{now}|{u["email"]}|{action}|{case_id}|{doc_id}'.encode()).hexdigest()
    c=db(); c.execute('INSERT INTO audit(ts,user_email,role,action,case_id,doc_id,ip,result,hash) VALUES(?,?,?,?,?,?,?,?,?)',(now,u['email'],u['role'],action,case_id,doc_id,ip,result,h)); c.commit(); c.close(); return h

def block(u,event,case_id='',doc_id=''):
    c=db(); prev=c.execute('SELECT current_hash FROM blocks ORDER BY id DESC LIMIT 1').fetchone(); prev=prev['current_hash'] if prev else '0'*64; idx=(c.execute('SELECT COUNT(*) n FROM blocks').fetchone()['n'])+1; now=datetime.now().isoformat(timespec='seconds'); cur=hashlib.sha256(f'{idx}|{now}|{case_id}|{doc_id}|{event}|{u["email"]}|{prev}'.encode()).hexdigest(); c.execute('INSERT INTO blocks(block_index,ts,case_id,doc_id,event,user_email,previous_hash,current_hash) VALUES(?,?,?,?,?,?,?,?)',(idx,now,case_id,doc_id,event,u['email'],prev,cur)); c.commit(); c.close(); return cur

def require(req,roles=None):
    u=user_from(req)
    if not u: raise HTTPException(401,'Login required')
    if roles and u['role'] not in roles: raise HTTPException(403,'Role not allowed')
    return u

# ---------- Hyperledger Fabric integration ----------
def fabric_record(event_type, actor, case_id='', doc_id='', data=None):
    """Send an audit event to the optional Hyperledger Fabric Gateway service.
    The application remains usable when Fabric is disabled/offline; local SQLite
    audit/block records continue to work as the prototype fallback.
    """
    if not FABRIC_ENABLED:
        return {'ok':False,'enabled':False}
    payload={
        'eventId':'TX-'+uuid.uuid4().hex,
        'caseId':case_id, 'docId':doc_id, 'eventType':event_type,
        'actor':actor, 'data':data or {}
    }
    try:
        req=urllib.request.Request(FABRIC_SERVICE_URL+'/record',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'},method='POST')
        with urllib.request.urlopen(req,timeout=8) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {'ok':False,'enabled':True,'error':str(e)}


@app.get('/',response_class=HTMLResponse)
def home(req:Request): return templates.TemplateResponse('index.html',{'request':req})

@app.get('/api/me')
def me(req:Request):
    u=user_from(req); return dict(u) if u else {'user':None}

@app.post('/api/login')
def login(req:Request,data:dict):
    c=db(); u=c.execute('SELECT * FROM users WHERE email=?',(data.get('email',''),)).fetchone(); c.close()
    if not u or not verify_password(data.get('password',''),u['password']):
        c=db(); c.execute('INSERT INTO security_events(ts,event,severity,details) VALUES(?,?,?,?)',(datetime.now().isoformat(timespec='seconds'),'Failed login attempt','HIGH',data.get('email','unknown'))); c.commit(); c.close()
        raise HTTPException(401,'Invalid demo credentials')
    r=JSONResponse({'ok':True,'user':dict(u)}); r.set_cookie('token',token(u),httponly=True,samesite='lax'); audit(u,'LOGIN'); return r

@app.post('/api/logout')
def logout(req:Request):
    u=user_from(req)
    if u: audit(u,'LOGOUT')
    r=JSONResponse({'ok':True}); r.delete_cookie('token'); return r

# ---------- dashboard ----------
@app.get('/api/dashboard')
def dashboard(req:Request):
    u=require(req); c=db()
    counts={}
    for s in ['FIR Registered','Investigation','Evidence Collection','Charge Sheet','Pre-Trial','Trial','Judgment','Closed']:
        counts[s]=c.execute('SELECT COUNT(*) n FROM cases WHERE status=?',(s,)).fetchone()['n']
    counts['Total']=c.execute('SELECT COUNT(*) n FROM cases').fetchone()['n']
    counts['Documents']=c.execute('SELECT COUNT(*) n FROM documents').fetchone()['n']
    counts['Audit Events']=c.execute('SELECT COUNT(*) n FROM audit').fetchone()['n']
    counts['Blocks']=c.execute('SELECT COUNT(*) n FROM blocks').fetchone()['n']
    counts['Pending Approvals']=c.execute("SELECT COUNT(*) n FROM approvals WHERE status='PENDING'").fetchone()['n']
    counts['Users']=c.execute('SELECT COUNT(*) n FROM users').fetchone()['n']
    mine=0
    if u['role']=='citizen': mine=c.execute('SELECT COUNT(*) n FROM cases WHERE complainant=?',(u['name'],)).fetchone()['n']
    elif u['role']=='lawyer': mine=c.execute('SELECT COUNT(*) n FROM cases WHERE lawyer=?',(u['name'],)).fetchone()['n']
    elif u['role']=='police': mine=c.execute('SELECT COUNT(*) n FROM cases WHERE officer=?',(u['name'],)).fetchone()['n']
    else: mine=counts['Total']
    counts['Mine']=mine
    recent=[dict(x) for x in c.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 8')]
    c.close(); return {'counts':counts,'recent':recent}

# ---------- cases ----------
def scope_clause(u,scope):
    if scope!='mine': return '',[]
    if u['role']=='citizen': return ' WHERE complainant=?',[u['name']]
    if u['role']=='lawyer': return ' WHERE lawyer=?',[u['name']]
    if u['role']=='police': return ' WHERE officer=?',[u['name']]
    return '',[]

@app.get('/api/cases')
def cases(req:Request,scope:str=Query('all')):
    u=require(req); c=db(); w,p=scope_clause(u,scope)
    rows=[dict(x) for x in c.execute('SELECT * FROM cases'+w+' ORDER BY id DESC',p)]; c.close(); return rows

@app.get('/api/cases/{case_id}')
def case_detail(req:Request,case_id:str):
    require(req); c=db(); x=c.execute('SELECT * FROM cases WHERE case_id=?',(case_id,)).fetchone()
    if not x: raise HTTPException(404,'Case not found')
    docs=[dict(d) for d in c.execute('SELECT id,doc_id,name,doc_type,uploaded_by,uploaded_at,sha256,version,access_level FROM documents WHERE case_id=? ORDER BY id DESC',(case_id,))]
    logs=[dict(a) for a in c.execute('SELECT * FROM audit WHERE case_id=? ORDER BY id DESC',(case_id,))]
    blocks=[dict(b) for b in c.execute('SELECT * FROM blocks WHERE case_id=? ORDER BY id',(case_id,))]
    c.close(); return {'case':dict(x),'documents':docs,'audit':logs,'blocks':blocks}

@app.post('/api/cases')
def create_case(req:Request,data:dict):
    u=require(req,['citizen','police','admin'])
    cid='NYC-'+datetime.now().strftime('%Y')+'-'+str(uuid.uuid4())[:8].upper()
    fir='FIR-KA-'+datetime.now().strftime('%Y')+'-'+str(uuid.uuid4().int%90000+10000)
    now=datetime.now().isoformat(timespec='seconds'); c=db()
    c.execute('INSERT INTO cases(case_id,fir_no,title,case_type,complainant,officer,lawyer,court,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        (cid,fir,data.get('title','New Complaint'),data.get('case_type','Criminal'),data.get('complainant',u['name']),'Demo Investigating Officer','Demo Lawyer','Demo District Court','FIR Registered',now,now))
    c.commit(); c.close(); audit(u,'FIR_CREATED',cid); block(u,'FIR_CREATED',cid); fabric_record('FIR_CREATED',u['email'],cid,data=data)
    return {'case_id':cid,'fir_no':fir}

@app.post('/api/cases/{case_id}/status')
def update_status(req:Request,case_id:str,data:dict):
    u=require(req,['police','judge','admin']); status=data.get('status')
    allowed=['FIR Registered','Investigation','Evidence Collection','Charge Sheet','Pre-Trial','Trial','Judgment','Closed']
    if status not in allowed: raise HTTPException(400,'Invalid status')
    c=db(); c.execute('UPDATE cases SET status=?,updated_at=? WHERE case_id=?',(status,datetime.now().isoformat(timespec='seconds'),case_id))
    if c.execute('SELECT changes()').fetchone()[0]==0:
        c.close(); raise HTTPException(404,'Case not found')
    c.commit(); c.close(); audit(u,'STATUS_UPDATED',case_id); block(u,'STATUS_UPDATED',case_id); fabric_record('STATUS_UPDATED',u['email'],case_id,data={'status':status}); return {'ok':True}

@app.post('/api/cases/{case_id}/decision')
def case_decision(req:Request,case_id:str,data:dict):
    u=require(req,['judge','admin']); status=data.get('status'); remarks=data.get('remarks','')
    if status not in ('Judgment','Closed'): raise HTTPException(400,'Decision must be Judgment or Closed')
    c=db(); x=c.execute('SELECT * FROM cases WHERE case_id=?',(case_id,)).fetchone()
    if not x: c.close(); raise HTTPException(404,'Case not found')
    c.execute('UPDATE cases SET status=?,remarks=?,updated_at=? WHERE case_id=?',(status,remarks,datetime.now().isoformat(timespec='seconds'),case_id))
    c.commit(); c.close(); audit(u,'CASE_DECISION',case_id); block(u,'CASE_DECISION',case_id); fabric_record('CASE_DECISION',u['email'],case_id,data={'status':status,'remarks':remarks}); return {'ok':True}

# ---------- documents ----------
@app.get('/api/documents')
def documents_list(req:Request,case_id:str=Query(None),scope:str=Query('all')):
    u=require(req); c=db()
    q='SELECT d.id,d.doc_id,d.case_id,d.name,d.doc_type,d.uploaded_by,d.uploaded_at,d.sha256,d.version,d.access_level,cs.title as case_title,cs.status as case_status FROM documents d JOIN cases cs ON d.case_id=cs.case_id'
    conds=[]; params=[]
    if case_id: conds.append('d.case_id=?'); params.append(case_id)
    if scope=='mine':
        if u['role']=='citizen': conds.append('cs.complainant=?'); params.append(u['name'])
        elif u['role']=='lawyer': conds.append('cs.lawyer=?'); params.append(u['name'])
        elif u['role']=='police': conds.append('cs.officer=?'); params.append(u['name'])
    if conds: q+=' WHERE '+' AND '.join(conds)
    q+=' ORDER BY d.id DESC'
    rows=[dict(x) for x in c.execute(q,params)]; c.close(); return rows

@app.post('/api/documents')
async def upload(req:Request,case_id:str=Form(...),doc_type:str=Form(...),access_level:str=Form('Restricted'),file:UploadFile=File(...)):
    u=require(req,['citizen','police','lawyer','judge','admin'])
    c=db(); exists=c.execute('SELECT 1 FROM cases WHERE case_id=?',(case_id,)).fetchone(); c.close()
    if not exists: raise HTTPException(404,'Case not found')
    content=await file.read()
    if not content: raise HTTPException(400,'Empty file')
    sha=hashlib.sha256(content).hexdigest(); did='DOC-'+uuid.uuid4().hex[:10].upper()
    safe=f'{did}_{os.path.basename(file.filename or "file")}'; path=os.path.join(UP,safe)
    with open(path,'wb') as f: f.write(content)
    now=datetime.now().isoformat(timespec='seconds')
    watermark=f'NYAYCHAIN | Viewed by: {u["email"]} | IP: 127.0.0.1 | {now} | Case: {case_id}'
    c=db(); c.execute('INSERT INTO documents(doc_id,case_id,name,doc_type,uploaded_by,uploaded_at,sha256,path,access_level,watermark) VALUES(?,?,?,?,?,?,?,?,?,?)',
        (did,case_id,file.filename,doc_type,u['email'],now,sha,path,access_level,watermark))
    c.commit(); c.close(); audit(u,'DOCUMENT_UPLOADED',case_id,did); bh=block(u,'DOCUMENT_UPLOADED',case_id,did); fabric=fabric_record('DOCUMENT_UPLOADED',u['email'],case_id,did,{'sha256':sha,'name':file.filename,'doc_type':doc_type,'version':1})
    return {'ok':True,'doc_id':did,'sha256':sha,'block_hash':bh,'fabric':fabric}

@app.get('/api/documents/{doc_id}')
def document(req:Request,doc_id:str):
    u=require(req); c=db(); d=c.execute('SELECT * FROM documents WHERE doc_id=?',(doc_id,)).fetchone(); c.close()
    if not d: raise HTTPException(404,'Document not found')
    audit(u,'DOCUMENT_VIEWED',d['case_id'],doc_id); return {'document':dict(d)}

@app.get('/api/documents/{doc_id}/download')
def download(req:Request,doc_id:str):
    u=require(req); c=db(); d=c.execute('SELECT * FROM documents WHERE doc_id=?',(doc_id,)).fetchone(); c.close()
    if not d: raise HTTPException(404,'Document not found')
    if not os.path.exists(d['path']): raise HTTPException(404,'File missing on server')
    audit(u,'DOCUMENT_DOWNLOADED',d['case_id'],doc_id); return FileResponse(d['path'],filename=d['name'])

# ---------- blockchain ledger ----------
def verify_chain(blocks):
    prev='0'*64
    for b in blocks:
        expected=hashlib.sha256(f'{b["block_index"]}|{b["ts"]}|{b["case_id"]}|{b["doc_id"]}|{b["event"]}|{b["user_email"]}|{prev}'.encode()).hexdigest()
        if expected!=b['current_hash'] or b['previous_hash']!=prev:return False
        prev=b['current_hash']
    return True

@app.get('/api/ledger')
def ledger(req:Request):
    require(req); c=db(); blocks=[dict(x) for x in c.execute('SELECT * FROM blocks ORDER BY id')]; c.close(); return {'blocks':blocks,'valid':verify_chain(blocks)}

@app.post('/api/ledger/verify')
def verify(req:Request):
    u=require(req); c=db(); blocks=[dict(x) for x in c.execute('SELECT * FROM blocks ORDER BY id')]; c.close()
    ok=verify_chain(blocks); audit(u,'BLOCKCHAIN_VERIFICATION',result='VALID' if ok else 'INVALID'); return {'valid':ok}

@app.post('/api/tamper')
def tamper(req:Request,data:dict):
    u=require(req,['admin','police']); doc_id=data.get('doc_id'); c=db(); d=c.execute('SELECT * FROM documents WHERE doc_id=?',(doc_id,)).fetchone(); c.close()
    if not d: raise HTTPException(404,'Document not found')
    fake=hashlib.sha256((d['sha256']+'TAMPERED').encode()).hexdigest()
    c=db(); c.execute('INSERT INTO security_events(ts,event,severity,details) VALUES(?,?,?,?)',(datetime.now().isoformat(timespec='seconds'),'Document tampering simulated','CRITICAL',f'{doc_id}: {d["sha256"][:12]} -> {fake[:12]}')); c.commit(); c.close()
    audit(u,'TAMPER_SIMULATION',d['case_id'],doc_id,'VIOLATION'); return {'violation':True,'original':d['sha256'],'current':fake}

# ---------- audit / security ----------
@app.get('/api/audit')
def audit_log(req:Request):
    require(req); c=db(); rows=[dict(x) for x in c.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 150')]; c.close(); return rows

@app.get('/api/fabric/status')
def fabric_status(req:Request):
    require(req)
    if not FABRIC_ENABLED: return {'enabled':False,'connected':False,'service_url':FABRIC_SERVICE_URL}
    try:
        with urllib.request.urlopen(FABRIC_SERVICE_URL+'/health',timeout=3) as r:
            return {'enabled':True,'connected':True,'service_url':FABRIC_SERVICE_URL,**json.loads(r.read().decode())}
    except Exception as e:
        return {'enabled':True,'connected':False,'service_url':FABRIC_SERVICE_URL,'error':str(e)}

@app.get('/api/security')
def security(req:Request):
    require(req,['police','judge','admin']); c=db(); rows=[dict(x) for x in c.execute('SELECT * FROM security_events ORDER BY id DESC LIMIT 50')]; c.close()
    return {'events':rows,'status':'SECURE','encryption':'ACTIVE','blockchain':'HYPERLEDGER FABRIC' if FABRIC_ENABLED else 'LOCAL HASH CHAIN','fabric_enabled':FABRIC_ENABLED,'audit':'ACTIVE','access_control':'ACTIVE'}

# ---------- approvals ----------
@app.post('/api/approvals')
def approval(req:Request,data:dict):
    u=require(req,['police','lawyer','judge','admin'])
    if not data.get('case_id'): raise HTTPException(400,'case_id required')
    rid='REQ-'+uuid.uuid4().hex[:8].upper(); now=datetime.now().isoformat(timespec='seconds'); c=db()
    c.execute('INSERT INTO approvals(request_id,case_id,action,requested_by,approver,status,created_at) VALUES(?,?,?,?,?,?,?)',
        (rid,data['case_id'],data.get('action','Release restricted evidence'),u['email'],'judge@demo.com','PENDING',now))
    c.commit(); c.close(); audit(u,'QUORUM_REQUESTED',data['case_id']); block(u,'QUORUM_REQUESTED',data['case_id']); fabric_record('QUORUM_REQUESTED',u['email'],data['case_id'],data={'action':data.get('action','Release restricted evidence')}); return {'request_id':rid}

@app.get('/api/approvals')
def approvals(req:Request,scope:str=Query('all')):
    u=require(req); c=db()
    if scope=='mine': rows=[dict(x) for x in c.execute('SELECT * FROM approvals WHERE requested_by=? ORDER BY id DESC',(u['email'],))]
    elif scope=='pending': rows=[dict(x) for x in c.execute("SELECT * FROM approvals WHERE status='PENDING' ORDER BY id DESC")]
    else: rows=[dict(x) for x in c.execute('SELECT * FROM approvals ORDER BY id DESC')]
    c.close(); return rows

@app.post('/api/approvals/{rid}/approve')
def approve(req:Request,rid:str):
    u=require(req,['judge','admin']); c=db(); x=c.execute('SELECT * FROM approvals WHERE request_id=?',(rid,)).fetchone()
    if not x: c.close(); raise HTTPException(404,'Request not found')
    c.execute('UPDATE approvals SET status=? WHERE request_id=?',('APPROVED',rid)); c.commit(); c.close()
    audit(u,'QUORUM_APPROVED',x['case_id']); block(u,'QUORUM_APPROVED',x['case_id']); fabric_record('QUORUM_APPROVED',u['email'],x['case_id'],data={'requestId':rid}); return {'ok':True}

@app.post('/api/approvals/{rid}/reject')
def reject(req:Request,rid:str):
    u=require(req,['judge','admin']); c=db(); x=c.execute('SELECT * FROM approvals WHERE request_id=?',(rid,)).fetchone()
    if not x: c.close(); raise HTTPException(404,'Request not found')
    c.execute('UPDATE approvals SET status=? WHERE request_id=?',('REJECTED',rid)); c.commit(); c.close()
    audit(u,'QUORUM_REJECTED',x['case_id']); block(u,'QUORUM_REJECTED',x['case_id']); fabric_record('QUORUM_REJECTED',u['email'],x['case_id'],data={'requestId':rid}); return {'ok':True}

# ---------- users (admin) ----------
@app.get('/api/users')
def list_users(req:Request):
    require(req,['admin']); c=db(); rows=[dict(x) for x in c.execute('SELECT id,email,role,name FROM users ORDER BY id')]; c.close(); return rows

@app.post('/api/users')
def create_user(req:Request,data:dict):
    u=require(req,['admin'])
    email=(data.get('email') or '').strip().lower(); name=(data.get('name') or '').strip()
    role=data.get('role'); password=data.get('password') or ''
    if not email or not name or not password: raise HTTPException(400,'Email, name and password are required')
    if role not in ROLES: raise HTTPException(400,'Invalid role')
    if len(password)<4: raise HTTPException(400,'Password too short')
    c=db()
    try:
        c.execute('INSERT INTO users(email,password,role,name) VALUES(?,?,?,?)',(email,hash_password(password),role,name)); c.commit()
    except sqlite3.IntegrityError:
        c.close(); raise HTTPException(400,'A user with that email already exists')
    c.close(); audit(u,'USER_CREATED'); block(u,'USER_CREATED'); fabric_record('USER_CREATED',u['email'],data={'createdEmail':email,'role':role}); return {'ok':True}

@app.delete('/api/users/{uid}')
def delete_user(req:Request,uid:int):
    u=require(req,['admin']); c=db(); target=c.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
    if not target: c.close(); raise HTTPException(404,'User not found')
    if target['email']==u['email']: c.close(); raise HTTPException(400,'You cannot delete your own account')
    c.execute('DELETE FROM users WHERE id=?',(uid,)); c.commit(); c.close(); audit(u,'USER_DELETED'); return {'ok':True}

# ---------- search ----------
@app.get('/api/search')
def search(req:Request,q:str=''):
    require(req); c=db(); like='%'+q+'%'
    cases=[dict(x) for x in c.execute('SELECT * FROM cases WHERE case_id LIKE ? OR fir_no LIKE ? OR title LIKE ? OR complainant LIKE ?',(like,like,like,like))]
    docs=[dict(x) for x in c.execute('SELECT doc_id,case_id,name,doc_type,uploaded_by,uploaded_at,sha256 FROM documents WHERE name LIKE ? OR doc_type LIKE ? OR uploaded_by LIKE ?',(like,like,like))]
    c.close(); return {'cases':cases,'documents':docs}
