Set-Location -Path "c:\WorkAtThammasat_Coding\cstuYear3Term2\cs366\366-Incident-Reporter-Service\terraform"
$DB_PASSWORD = terraform output -raw db_password
$RDS_ENDPOINT = terraform output -raw rds_endpoint
$DB_HOST = $RDS_ENDPOINT.Split(':')[0]
$env:PGPASSWORD = $DB_PASSWORD
psql -h $DB_HOST -U incident_admin -d incident_db -c "UPDATE `"Incidents`" SET severity='HIGH';"
Remove-Item Env:\PGPASSWORD
