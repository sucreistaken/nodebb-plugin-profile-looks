<div class="card panel panel-default">
    <div class="panel-heading">
        <h3 class="panel-title"><i class="fa fa-eye"></i> {title}</h3>
    </div>
    <div class="panel-body">
        <ul class="list-unstyled">
            {{{ each viewers }}}
            <li style="display: flex; align-items: center; margin-bottom: 10px;">
                <a href="{config.relative_path}/user/{viewers.userslug}">
                    {{{ if viewers.picture }}}
                    <img src="{viewers.picture}" class="avatar avatar-sm" style="border-radius: 50%; margin-right: 10px;" />
                    {{{ else }}}
                    <div class="avatar avatar-sm" style="background-color: #ddd; border-radius: 50%; margin-right: 10px;"></div>
                    {{{ end }}}
                </a>
                <a href="{config.relative_path}/user/{viewers.userslug}">
                    {viewers.username}
                </a>
            </li>
            {{{ end }}}
        </ul>
    </div>
</div>