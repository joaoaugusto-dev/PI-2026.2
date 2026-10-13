# amostra CPU% instantânea (delta de jiffies), RSS do processo da API e conexões do app no Postgres
import os, sys, time, subprocess
pid, out, pw = sys.argv[1], sys.argv[2], sys.argv[3]
hz = os.sysconf('SC_CLK_TCK')
env = dict(os.environ, PGPASSWORD=pw)
def jiffies():
    f = open(f'/proc/{pid}/stat').read().rsplit(')', 1)[1].split()
    return int(f[11]) + int(f[12])
def rss():
    for l in open(f'/proc/{pid}/status'):
        if l.startswith('VmRSS'): return int(l.split()[1]) // 1024
with open(out, 'w') as o:
    o.write('ts,cpu,rss_mb,pg_conns\n')
    j0, t0 = jiffies(), time.time()
    while os.path.exists(f'/proc/{pid}'):
        time.sleep(1)
        j1, t1 = jiffies(), time.time()
        c = subprocess.run(['psql', '-h', 'localhost', '-U', 'soufer_audit_app', '-d', 'soufer_audit', '-tAc',
                            "select count(*) from pg_stat_activity where usename='soufer_audit_app'"], env=env, capture_output=True, text=True).stdout.strip()
        o.write(f'{t1:.1f},{100*(j1-j0)/hz/(t1-t0):.1f},{rss()},{c}\n'); o.flush()
        j0, t0 = j1, t1
