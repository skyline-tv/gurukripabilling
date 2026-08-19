function PageTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <button className="primary" type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

export default PageTitle;
